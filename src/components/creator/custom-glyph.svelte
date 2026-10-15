<script lang="ts">
	import { createEventDispatcher, onMount, tick, untrack } from "svelte";
	import { Plus, RotateCcw, Trash2 } from "lucide-svelte";

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

	type BrushShape = "round" | "square";

	let brushSize = $state(4);
	let brushShape = $state<BrushShape>("round");
	let brushColor = $state("#111827");

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

	const resetCanvas = (canvas: HTMLCanvasElement, glyphId: number) => {
		const context = canvas.getContext("2d");
		if (!context) return;

		context.lineCap = brushShape === "round" ? "round" : "butt";
		context.lineJoin = brushShape === "round" ? "round" : "miter";
		context.lineWidth = brushSize;
		context.strokeStyle = brushColor;
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, canvas.width, canvas.height);

		contextMap.set(glyphId, context);
	};

	function fillStyleForSquareBrush(
		context: CanvasRenderingContext2D,
		color: string,
	) {
		context.fillStyle = color;
	}

	const registerCanvas = (node: HTMLCanvasElement, glyphId: number) => {
		canvasMap.set(glyphId, node);
		resetCanvas(node, glyphId);
		return {
			destroy() {
				canvasMap.delete(glyphId);
				contextMap.delete(glyphId);
			},
		};
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
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, encodedCanvas.width, encodedCanvas.height);

		encodedGlyphs.forEach(({ glyph, symbol }, index) => {
			const row = Math.floor(index / maxPerRow);
			const col = index % maxPerRow;
			const x = col * (glyphCellWidth + gap);
			const y = row * (glyphCellHeight + gap);

			if (!glyph) {
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
				return;
			}

			const sourceCanvas = canvasMap.get(glyph.id);
			if (sourceCanvas) {
				const drawWidth = 64;
				const drawHeight = 64;
				const drawX = x + (glyphCellWidth - drawWidth) / 2;
				const drawY = y + (glyphCellHeight - drawHeight) / 2;
				context.drawImage(
					sourceCanvas,
					drawX,
					drawY,
					drawWidth,
					drawHeight,
				);
			} else {
				context.fillStyle = "#111827";
				context.font = "24px sans-serif";
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.font = `${Math.min(24, 48 / [...symbol].length)}px sans-serif`;
				context.fillText(
					symbol,
					x + glyphCellWidth / 2,
					y + glyphCellHeight / 2,
					glyphCellWidth - 4,
				);
			}
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

	const draw = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !canvas || !drawingMap.get(id)) return;

		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

		if (brushShape === "square") {
			drawSquareStamp(context, x, y);
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

		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

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

	$effect(() => {
		renderEncodedCanvas();
	});

	$effect(() => {
		const currentMessage = message;

		untrack(() => {
			void syncGlyphsToMessage(currentMessage);
		});
	});

	$effect(() => {
		const size = brushSize;
		const shape = brushShape;
		const color = brushColor;

		for (const context of contextMap.values()) {
			context.lineWidth = size;
			context.lineCap = shape === "round" ? "round" : "butt";
			context.lineJoin = shape === "round" ? "round" : "miter";
			context.strokeStyle = color;
			context.fillStyle = color;
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
		<input bind:value={message} type="text" name="message" id="message" />
	</div>

	<div class="brush-controls">
		<label>
			Brush shape
			<select bind:value={brushShape}>
				<option value="round">Round pen</option>
				<option value="square">Square pen</option>
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
	</div>

	<div class="glyph-grid">
		{#each glyphs as glyph (glyph.id)}
			<div class="glyph-card">
				<label>
					Character
					<input bind:value={glyph.char} type="text" />
				</label>

				<canvas
					data-glyph-id={glyph.id}
					width="128"
					height="128"
					use:registerCanvas={glyph.id}
					on:pointerdown={(event) => startDrawing(event, glyph.id)}
					on:pointermove={(event) => draw(event, glyph.id)}
					on:pointerup={() => stopDrawing(glyph.id)}
					on:pointerleave={() => stopDrawing(glyph.id)}
					on:pointercancel={() => stopDrawing(glyph.id)}
				></canvas>

				<div class="glyph-actions">
					<button
						type="button"
						on:click={() => resetGlyph(glyph.id)}
						aria-label={`Reset glyph ${glyph.id}`}
					>
						<RotateCcw size={14} />
					</button>
					<button
						type="button"
						on:click={() => removeGlyph(glyph.id)}
						aria-label={`Remove glyph ${glyph.id}`}
					>
						<Trash2 size={14} />
					</button>
				</div>
			</div>
		{/each}
	</div>

	<div class="output">
		<strong>Cipher text:</strong>
		<span>{cipherText}</span>
	</div>

	<canvas bind:this={encodedCanvas} aria-label="Encoded glyph canvas"
	></canvas>
</div>

<style>
	.brush-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 1rem;
		margin-bottom: 1rem;
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
</style>
