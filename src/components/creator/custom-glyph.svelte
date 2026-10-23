<script lang="ts">
	import { createEventDispatcher, onMount, tick, untrack } from "svelte";
	import { RotateCcw } from "lucide-svelte";

	type Glyph = {
		id: number;
		char: string;
		dataUrl: string;
	};

	type CustomGlyphConfig = {
		message: string;
		glyphs: Glyph[];
	};

	const dispatch = createEventDispatcher<{
		cipherChange: CustomGlyphConfig;
	}>();

	type BrushShape = "round" | "square" | "pencil";

	const MIN_RESOLUTION = 3;

	let brushSize = $state(4);
	let brushShape = $state<BrushShape>("round");
	let brushColor = $state("#CFD8EB");
	let canvasDisplaySize = $state(128);
	let canvasResolution = $state(128);

	// Resolution can never exceed the display size. Using a derived value
	// (instead of overwriting canvasResolution) means the chosen resolution
	// comes back if the display size is enlarged again.
	const effectiveResolution = $derived(
		Math.max(MIN_RESOLUTION, Math.min(canvasResolution, canvasDisplaySize)),
	);

	const BRUSH_SIZES = [
		{ label: "Fine", value: 2 },
		{ label: "Medium", value: 4 },
		{ label: "Thick", value: 8 },
		{ label: "Bold", value: 14 },
	];

	let encodedCanvas: HTMLCanvasElement;

	type CustomGlyphProps = {
		message?: string;
		glyphs?: Glyph[];
	};

	let { message = $bindable(""), glyphs = $bindable([]) }: CustomGlyphProps =
		$props();

	let nextId = $state(Math.max(0, ...glyphs.map((glyph) => glyph.id)) + 1);

	const canvasMap = new Map<number, HTMLCanvasElement>();
	const contextMap = new Map<number, CanvasRenderingContext2D>();
	const drawingMap = new Map<number, boolean>();

	// Changing a canvas's width/height wipes its context state, so brush
	// settings are applied through one helper that can be re-run after resizes.
	const applyBrush = (context: CanvasRenderingContext2D) => {
		const isPencil = brushShape === "pencil";

		context.lineCap = brushShape === "round" ? "round" : "butt";
		context.lineJoin = brushShape === "round" ? "round" : "miter";
		context.lineWidth = brushSize;
		context.strokeStyle = brushColor;
		context.fillStyle = brushColor;

		// Use hard pixel edges for the pencil tool.
		context.imageSmoothingEnabled = !isPencil;
	};

	const resetCanvas = (canvas: HTMLCanvasElement, glyphId: number) => {
		const context = canvas.getContext("2d");
		if (!context) return;

		context.clearRect(0, 0, canvas.width, canvas.height);
		applyBrush(context);

		contextMap.set(glyphId, context);
	};

	const registerCanvas = (node: HTMLCanvasElement, glyphId: number) => {
		// Set the intrinsic size here rather than via a template attribute, so
		// that resolution changes go through resizeGlyphCanvases (which keeps the
		// drawing) instead of Svelte clearing the canvas by resetting width.
		const size = untrack(() => effectiveResolution);
		node.width = size;
		node.height = size;

		canvasMap.set(glyphId, node);
		resetCanvas(node, glyphId);
		return {
			destroy() {
				canvasMap.delete(glyphId);
				contextMap.delete(glyphId);
			},
		};
	};

	// Resample every glyph canvas to the new resolution, keeping what was drawn.
	const resizeGlyphCanvases = (size: number) => {
		let changed = false;

		for (const [id, canvas] of canvasMap) {
			if (canvas.width === size && canvas.height === size) continue;

			const oldWidth = canvas.width;
			const oldHeight = canvas.height;

			const snapshot = document.createElement("canvas");
			snapshot.width = oldWidth;
			snapshot.height = oldHeight;
			snapshot.getContext("2d")?.drawImage(canvas, 0, 0);

			canvas.width = size;
			canvas.height = size;

			const context = canvas.getContext("2d");
			if (!context) continue;

			// Smooth when shrinking so thin strokes don't vanish; keep pixels
			// hard-edged when enlarging so low-res glyphs stay crisp.
			context.imageSmoothingEnabled = size < oldWidth;
			context.imageSmoothingQuality = "high";
			context.drawImage(snapshot, 0, 0, size, size);

			applyBrush(context);
			contextMap.set(id, context);
			drawingMap.set(id, false);
			changed = true;
		}

		if (!changed) return;

		glyphs = glyphs.map((glyph) => {
			const canvas = canvasMap.get(glyph.id);
			return canvas
				? { ...glyph, dataUrl: canvas.toDataURL("image/png") }
				: glyph;
		});

		renderEncodedCanvas();

		dispatch("cipherChange", {
			message,
			glyphs: [...glyphs],
		});
	};

	const resetGlyph = (id: number) => {
		const canvas = canvasMap.get(id);
		if (!canvas) return;

		resetCanvas(canvas, id);
		updateGlyphData(id);
	};

	const removeGlyph = (id: number) => {
		glyphs = glyphs.filter((glyph) => glyph.id !== id);

		renderEncodedCanvas();

		dispatch("cipherChange", {
			message,
			glyphs: [...glyphs],
		});
	};

	const syncGlyphsToMessage = async (value: string) => {
		const requiredChars = [
			...new Set(
				[...value.toLowerCase()].filter((char) => /[a-z]/.test(char)),
			),
		];

		const existingChars = new Set(
			glyphs.map((glyph) => glyph.char.trim().toLowerCase()),
		);

		const missingChars = requiredChars.filter(
			(char) => !existingChars.has(char),
		);

		if (missingChars.length === 0) return;

		const newGlyphs = missingChars.map((char) => ({
			id: nextId++,
			char,
			dataUrl: "",
		}));

		glyphs = [...glyphs, ...newGlyphs];

		await tick();

		for (const glyph of newGlyphs) {
			const canvas = canvasMap.get(glyph.id);
			if (canvas) {
				resetCanvas(canvas, glyph.id);
			}
		}

		renderEncodedCanvas();

		// Immediately synchronize the new canvases with the parent.
		dispatch("cipherChange", {
			message,
			glyphs: [...glyphs],
		});
	};

	const updateGlyphData = (id: number) => {
		const canvas = canvasMap.get(id);
		if (!canvas) return;

		const dataUrl = canvas.toDataURL("image/png");

		glyphs = glyphs.map((glyph) =>
			glyph.id === id ? { ...glyph, dataUrl } : glyph,
		);

		dispatch("cipherChange", {
			message,
			glyphs: [...glyphs],
		});

		renderEncodedCanvas();
	};

	const encodeMessage = (value: string) => {
		const chars = [...value];
		const configuredGlyphs = glyphs
			.map((glyph) => ({ glyph, symbol: glyph.char.trim() }))
			.filter(({ symbol }) => symbol.length > 0);
		const singleCharacterGlyphs = configuredGlyphs.filter(
			({ symbol }) => [...symbol].length === 1,
		);
		const multiCharacterGlyphs = configuredGlyphs
			.filter(({ symbol }) => [...symbol].length > 1)
			.sort(
				(left, right) =>
					[...right.symbol].length - [...left.symbol].length,
			);
		const encoded: Array<{
			glyph?: Glyph;
			symbol: string;
			start: number;
			end: number;
		}> = [];

		for (let index = 0; index < chars.length; ) {
			const singleMatch = singleCharacterGlyphs.find(
				({ symbol }) =>
					chars[index].toUpperCase() === symbol.toUpperCase(),
			);

			if (singleMatch) {
				encoded.push({
					glyph: singleMatch.glyph,
					symbol: singleMatch.symbol,
					start: index,
					end: index + 1,
				});
				index += 1;
				continue;
			}

			const multiMatch = multiCharacterGlyphs.find(({ symbol }) => {
				const symbolLength = [...symbol].length;
				return (
					index + 1 >= symbolLength &&
					chars
						.slice(index + 1 - symbolLength, index + 1)
						.join("")
						.toUpperCase() === symbol.toUpperCase()
				);
			});
			if (multiMatch) {
				const start = index + 1 - [...multiMatch.symbol].length;
				while (
					encoded.length &&
					encoded[encoded.length - 1].end > start
				) {
					encoded.pop();
				}
				encoded.push({
					glyph: multiMatch.glyph,
					symbol: multiMatch.symbol,
					start,
					end: index + 1,
				});
				index += 1;
				continue;
			}

			const char = chars[index];
			const alphabetIndex = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(
				char.toUpperCase(),
			);
			const fallbackGlyph =
				alphabetIndex >= 0 ? glyphs[alphabetIndex] : undefined;
			const fallbackSymbol = fallbackGlyph?.char.trim();
			encoded.push({
				glyph: fallbackSymbol ? fallbackGlyph : undefined,
				symbol: fallbackSymbol || char,
				start: index,
				end: index + 1,
			});
			index += 1;
		}

		return encoded;
	};

	const renderEncodedCanvas = () => {
		if (!encodedCanvas) return;

		const context = encodedCanvas.getContext("2d");
		if (!context) return;

		const encodedGlyphs = encodeMessage(message.toUpperCase());
		const glyphCellWidth = 64;
		const glyphCellHeight = 64;
		const gap = 8;
		const maxPerRow = 12;
		const rowCount = Math.max(
			1,
			Math.ceil(encodedGlyphs.length / maxPerRow),
		);
		const canvasWidth = Math.max(
			Math.min(encodedGlyphs.length, maxPerRow) * glyphCellWidth +
				(Math.min(encodedGlyphs.length, maxPerRow) - 1) * gap,
			glyphCellWidth,
		);
		const canvasHeight = rowCount * glyphCellHeight + (rowCount - 1) * gap;

		encodedCanvas.width = canvasWidth;
		encodedCanvas.height = canvasHeight;
		context.clearRect(0, 0, encodedCanvas.width, encodedCanvas.height);

		// Resizing resets context state; low-resolution glyphs should scale up
		// as hard pixels rather than a blur.
		context.imageSmoothingEnabled = false;

		encodedGlyphs.forEach(({ glyph, symbol }, index) => {
			const row = Math.floor(index / maxPerRow);
			const col = index % maxPerRow;
			const x = col * (glyphCellWidth + gap);
			const y = row * (glyphCellHeight + gap);

			const sourceCanvas = glyph ? canvasMap.get(glyph.id) : undefined;

			if (sourceCanvas) {
				context.drawImage(
					sourceCanvas,
					x,
					y,
					glyphCellWidth,
					glyphCellHeight,
				);
				return;
			}

			context.fillStyle = "#111827";
			context.font = `${Math.min(24, 48 / [...symbol].length)}px sans-serif`;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText(
				symbol,
				x + glyphCellWidth / 2,
				y + glyphCellHeight / 2,
				glyphCellWidth - 4,
			);
		});
	};

	const drawSquareStamp = (
		context: CanvasRenderingContext2D,
		x: number,
		y: number,
	) => {
		const size = brushSize;
		context.fillStyle = brushColor;
		context.fillRect(x - size / 2, y - size / 2, size, size);
	};

	const toCanvasPoint = (event: PointerEvent, canvas: HTMLCanvasElement) => {
		const rect = canvas.getBoundingClientRect();

		let x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		let y = ((event.clientY - rect.top) / rect.height) * canvas.height;

		if (brushShape === "pencil") {
			x = Math.floor(x);
			y = Math.floor(y);
		}

		return { x, y };
	};

	const draw = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !canvas || !drawingMap.get(id)) return;

		const { x, y } = toCanvasPoint(event, canvas);

		if (brushShape === "square") {
			drawSquareStamp(context, x, y);
		} else if (brushShape === "pencil") {
			context.fillRect(x, y, 1, 1);
		} else {
			context.lineTo(x, y);
			context.stroke();
			context.beginPath();
			context.moveTo(x, y);
		}
	};

	const startDrawing = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !canvas) return;

		canvas.setPointerCapture(event.pointerId);
		drawingMap.set(id, true);

		const { x, y } = toCanvasPoint(event, canvas);

		context.beginPath();
		context.moveTo(x, y);

		// Draw immediately, even for a single click.
		if (brushShape === "square") {
			drawSquareStamp(context, x, y);
		} else {
			context.lineTo(x, y);
			context.stroke();
			context.beginPath();
			context.moveTo(x, y);
		}
	};

	const stopDrawing = (id: number) => {
		if (!drawingMap.get(id)) return;

		drawingMap.set(id, false);

		const context = contextMap.get(id);
		if (context) {
			context.beginPath();
		}

		updateGlyphData(id);
	};

	const cipherText = $derived.by(() => {
		return encodeMessage(message.toUpperCase())
			.map(({ symbol }) => symbol)
			.join("");
	});

	// Repaint the encoded output whenever the message, glyphs, or either
	// canvas size changes.
	$effect(() => {
		void canvasDisplaySize;
		void effectiveResolution;
		renderEncodedCanvas();
	});

	// Resample glyph canvases when the resolution changes. untrack keeps the
	// glyphs write inside resizeGlyphCanvases from re-triggering this effect.
	$effect(() => {
		const size = effectiveResolution;
		untrack(() => resizeGlyphCanvases(size));
	});

	$effect(() => {
		const currentMessage = message;

		untrack(() => {
			void syncGlyphsToMessage(currentMessage);
		});
	});

	$effect(() => {
		void brushSize;
		void brushShape;
		void brushColor;

		for (const context of contextMap.values()) {
			applyBrush(context);
		}
	});

	onMount(() => {
		for (const glyph of glyphs) {
			const canvas = canvasMap.get(glyph.id);
			if (canvas) {
				resetCanvas(canvas, glyph.id);
			}
		}
		renderEncodedCanvas();
	});
</script>

<div class="cipher">
	<div class="controls">
		<label for="message">Enter your message</label>
		<textarea bind:value={message} name="message" id="message" rows="4"
		></textarea>
	</div>

	{#if message === ""}
		<p class="empty-message">
			Please enter a message to start creating your cipher.
		</p>
	{/if}

	{#if message !== ""}
		<div class="brush-controls">
			<label>
				Brush shape
				<select bind:value={brushShape}>
					<option value="round">Round pen</option>
					<option value="square">Square pen</option>
					<option value="pencil">Pencil</option>
				</select>
			</label>

			<label>
				Brush size

				<select bind:value={brushSize}>
					{#each BRUSH_SIZES as size}
						<option value={size.value}>
							{size.label} ({size.value}px)
						</option>
					{/each}
				</select>
			</label>

			<label class="color-control">
				Brush color
				<div class="color-picker">
					<input
						type="color"
						bind:value={brushColor}
						aria-label="Choose brush color"
					/>
					<span>{brushColor.toUpperCase()}</span>
				</div>
			</label>

			<div class="brush-preview">
				<span>Preview</span>
				<div
					class="brush-dot"
					class:round={brushShape === "round"}
					style:background-color={brushColor}
					style:width={`${brushSize * 2}px`}
					style:height={`${brushSize * 2}px`}
				></div>
			</div>

			<label class="canvas-size-control">
				Canvas size
				<input
					type="range"
					min="80"
					max="256"
					step="16"
					bind:value={canvasDisplaySize}
				/>
				<span>{canvasDisplaySize}px</span>
			</label>

			<label class="canvas-resolution-control">
				Canvas resolution
				<input
					type="range"
					min={MIN_RESOLUTION}
					max={canvasDisplaySize}
					step="1"
					bind:value={canvasResolution}
				/>
				<span>{effectiveResolution}×{effectiveResolution}px</span>
			</label>
		</div>

		<div
			class="glyph-grid"
			style={`--glyph-display-size: ${canvasDisplaySize}px`}
		>
			{#each glyphs as glyph (glyph.id)}
				<div class="glyph-card">
					<span class="glyph-char">{glyph.char}</span>

					<canvas
						data-glyph-id={glyph.id}
						style={`--glyph-display-size: ${canvasDisplaySize}px`}
						use:registerCanvas={glyph.id}
						onpointerdown={(event) => startDrawing(event, glyph.id)}
						onpointermove={(event) => draw(event, glyph.id)}
						onpointerup={() => stopDrawing(glyph.id)}
						onpointerleave={() => stopDrawing(glyph.id)}
						onpointercancel={() => stopDrawing(glyph.id)}
					></canvas>

					<div class="glyph-actions">
						<button
							type="button"
							onclick={() => resetGlyph(glyph.id)}
							aria-label={`Reset glyph ${glyph.id}`}
						>
							<RotateCcw size={14} />
							Clear
						</button>
						<!-- <button
						type="button"
						onclick={() => removeGlyph(glyph.id)}
						aria-label={`Remove glyph ${glyph.id}`}
					>
						<Trash2 size={14} />
					</button> -->
					</div>
				</div>
			{/each}
		</div>

		<div class="output">
			<strong>Cipher text:</strong>
			<span>{cipherText}</span>
		</div>
	{/if}

	<canvas bind:this={encodedCanvas} aria-label="Encoded glyph canvas"
	></canvas>
</div>

<style>
	.controls {
		padding: 1rem;
		text-align: center;
		background-color: #000;
	}

	.controls label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.controls textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font: inherit;
		resize: vertical;
		box-sizing: border-box;
		min-height: 100px;
	}
	.brush-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 1rem;
		margin-bottom: 1rem;
		background-color: #000;
		padding: 1rem;
	}

	.brush-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.875rem;
	}

	.brush-controls select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		color: #111827;
	}

	.brush-preview {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.brush-dot {
		background: #111827;
		flex-shrink: 0;
	}

	.brush-dot.round {
		border-radius: 50%;
	}

	.color-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 38px;
	}

	.color-picker input[type="color"] {
		width: 42px;
		height: 38px;
		padding: 3px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		cursor: pointer;
	}

	.color-picker span {
		font-family: monospace;
		font-size: 0.875rem;
	}

	/* Responsive grid: cards size themselves around the selected canvas size. */
	.glyph-grid {
		display: grid;
		grid-template-columns: repeat(
			auto-fill,
			minmax(
				min(100%, calc(var(--glyph-display-size, 128px) + 1.5rem)),
				1fr
			)
		);
		align-items: start;
		justify-items: center;
		gap: 1rem;
		width: 100%;
		box-sizing: border-box;
	}

	.glyph-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}

	.glyph-char {
		font-weight: 700;
		font-size: 1.125rem;
		line-height: 1.2;
	}

	/* Keep the canvas square and responsive without changing its pixel resolution. */
	.glyph-card canvas {
		display: block;
		width: min(var(--glyph-display-size, 64px), 100%);
		max-width: 100%;
		aspect-ratio: 1;
		height: auto;
		box-sizing: border-box;
		image-rendering: pixelated;
		touch-action: none;
		border: 1px solid #ffffff;
		border-radius: 0;
	}

	.glyph-actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 100%;
	}

	.glyph-actions button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		max-width: 100%;
	}

	/* The generated preview should scale to its container instead of overflowing. */
	.output {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		margin-block: 1rem;
		overflow-wrap: anywhere;
	}

	.cipher > canvas {
		display: block;
		max-width: 100%;
		height: auto;
		image-rendering: pixelated;
	}
</style>
