<script lang="ts">
	import { createEventDispatcher, onMount, tick, untrack } from "svelte";
	import { Brush, ChevronLeft, ChevronRight, Circle, Download, Eraser, GalleryHorizontal, Grid3X3, LayoutGrid, Maximize2, PaintBucket, RotateCcw, Slash } from "lucide-svelte";
	import { syncMessageGlyphs } from "$lib/message-glyphs";
	import { downloadCustomGlyphFont } from "$lib/custom-glyph-font";
	import { floodFill } from "$lib/flood-fill";

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

	type BrushShape = "round" | "line" | "eraser" | "fill";

	const brushTools: { value: BrushShape; label: string; icon: typeof Brush }[] = [
		{ value: "round", label: "Round pen", icon: Brush },
		{ value: "line", label: "Line", icon: Slash },
		{ value: "eraser", label: "Eraser", icon: Eraser },
		{ value: "fill", label: "Fill", icon: PaintBucket },
	];

	const MIN_RESOLUTION = 3;

	let brushSize = $state(4);
	let brushShape = $state<BrushShape>("round");
	let hardEdges = $state(false);
	let brushColor = $state("#CFD8EB");
	let canvasDisplaySize = $state(128);
	let canvasResolution = $state(128);
	let brushSizeError = $state("");
	let canvasSizeError = $state("");
	let canvasResolutionError = $state("");
	let fontExportError = $state("");
	let viewMode = $state<"grid" | "gallery">("grid");
	let activeGlyphId = $state<number | null>(null);
	let showResolutionGrid = $state(false);
	let brushCursor = $state<{
		id: number;
		x: number;
		y: number;
		left: number;
		top: number;
		scaleX: number;
		scaleY: number;
	} | null>(null);

	const cursorPreview = $derived.by(() => {
		if (!brushCursor || brushShape === "fill") return null;

		const offset = brushSize % 2 ? 0.5 : 0;
		const x = hardEdges ? Math.floor(brushCursor.x) + offset : brushCursor.x;
		const y = hardEdges ? Math.floor(brushCursor.y) + offset : brushCursor.y;
		return {
			id: brushCursor.id,
			left: brushCursor.left + x * brushCursor.scaleX,
			top: brushCursor.top + y * brushCursor.scaleY,
			width: brushSize * brushCursor.scaleX,
			height: brushSize * brushCursor.scaleY,
		};
	});

	// Resolution can never exceed the display size. Using a derived value
	// (instead of overwriting canvasResolution) means the chosen resolution
	// comes back if the display size is enlarged again.
	const effectiveResolution = $derived(
		Math.max(MIN_RESOLUTION, Math.min(canvasResolution, canvasDisplaySize)),
	);

	const setBrushSize = (input: HTMLInputElement) => {
		const value = input.valueAsNumber;
		if (!Number.isInteger(value) || value < 1 || value > effectiveResolution) {
			brushSizeError = `Enter a whole number between 1 and ${effectiveResolution}.`;
			input.value = String(brushSize);
			return;
		}
		brushSizeError = "";
		brushSize = value;
	};

	const setCanvasSize = (input: HTMLInputElement) => {
		const value = input.valueAsNumber;
		if (!Number.isInteger(value) || value < 80 || value > 256) {
			canvasSizeError = "Enter a whole number between 80 and 256.";
			input.value = String(canvasDisplaySize);
			return;
		}
		canvasSizeError = "";
		canvasResolutionError = "";
		canvasDisplaySize = value;
	};

	const setCanvasResolution = (input: HTMLInputElement) => {
		const value = input.valueAsNumber;
		if (!Number.isInteger(value) || value < MIN_RESOLUTION || value > canvasDisplaySize) {
			canvasResolutionError = `Enter a whole number between ${MIN_RESOLUTION} and ${canvasDisplaySize}.`;
			input.value = String(effectiveResolution);
			return;
		}
		canvasResolutionError = "";
		canvasResolution = value;
	};

	// TODO add emoji support

	let encodedCanvas: HTMLCanvasElement;

	type CustomGlyphProps = {
		message?: string;
		glyphs?: Glyph[];
	};

	let { message = $bindable(""), glyphs = $bindable([]) }: CustomGlyphProps =
		$props();

	let nextId = $state(Math.max(0, ...glyphs.map((glyph) => glyph.id)) + 1);
	const activeGlyphIndex = $derived(
		Math.max(0, glyphs.findIndex((glyph) => glyph.id === activeGlyphId)),
	);

	const canvasMap = new Map<number, HTMLCanvasElement>();
	const contextMap = new Map<number, CanvasRenderingContext2D>();
	const drawingMap = new Map<number, boolean>();
	const lastPointMap = new Map<number, { x: number; y: number }>();
	let hardStrokeCanvas: HTMLCanvasElement | undefined;
	// Line tool: the canvas as it was before the current stroke, so the line can be redrawn while dragging.
	const lineStartMap = new Map<
		number,
		{ start: { x: number; y: number }; snapshot: ImageData }
	>();

	// Changing a canvas's width/height wipes its context state, so brush
	// settings are applied through one helper that can be re-run after resizes.
	const applyBrush = (context: CanvasRenderingContext2D) => {
		const isEraser = brushShape === "eraser";

		context.lineCap =
			brushShape === "round" || isEraser ? "round" : "butt";
		context.lineJoin =
			brushShape === "round" || isEraser ? "round" : "miter";
		context.lineWidth = brushSize;
		context.strokeStyle = brushColor;
		context.fillStyle = brushColor;
		context.globalCompositeOperation = isEraser
			? "destination-out"
			: "source-over";

		context.imageSmoothingEnabled = true;
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

	const syncGlyphsToMessage = (value: string) => {
		const updated = syncMessageGlyphs(value, glyphs, () => nextId++);
		if (updated === glyphs) return;

		glyphs = updated;
		dispatch("cipherChange", {
			message,
			glyphs: [...glyphs],
		});
		void tick().then(() => renderEncodedCanvas());
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

	const downloadFont = async () => {
		fontExportError = "";

		try {
			await downloadCustomGlyphFont(glyphs);
		} catch (error) {
			console.error("Failed to export custom glyph font", error);
			fontExportError =
				error instanceof Error
					? error.message
					: "Something went wrong while creating the font.";
		}
	};

	const drawHardStroke = (
		context: CanvasRenderingContext2D,
		from: { x: number; y: number },
		to: { x: number; y: number },
	) => {
		hardStrokeCanvas ??= document.createElement("canvas");
		const mask = hardStrokeCanvas;
		if (mask.width !== context.canvas.width || mask.height !== context.canvas.height) {
			mask.width = context.canvas.width;
			mask.height = context.canvas.height;
		}
		const maskContext = mask.getContext("2d", { willReadFrequently: true });
		if (!maskContext) throw new Error("Unable to create the hard-edge brush canvas.");

		maskContext.clearRect(0, 0, mask.width, mask.height);
		maskContext.strokeStyle = brushColor;
		maskContext.lineWidth = brushSize;
		maskContext.lineCap = brushShape === "line" ? "butt" : "round";
		maskContext.beginPath();
		maskContext.moveTo(from.x, from.y);
		maskContext.lineTo(to.x, to.y);
		maskContext.stroke();

		const pixels = maskContext.getImageData(0, 0, mask.width, mask.height);
		// Threshold the stroke mask before compositing so edges occupy whole pixels.
		for (let i = 3; i < pixels.data.length; i += 4) {
			pixels.data[i] = pixels.data[i] >= 128 ? 255 : 0;
		}
		maskContext.putImageData(pixels, 0, 0);
		context.drawImage(mask, 0, 0);
	};

	const toCanvasPoint = (event: PointerEvent, canvas: HTMLCanvasElement) => {
		const rect = canvas.getBoundingClientRect();

		let x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		let y = ((event.clientY - rect.top) / rect.height) * canvas.height;

		if (hardEdges && brushShape !== "fill") {
			const offset = brushSize % 2 ? 0.5 : 0;
			x = Math.floor(x) + offset;
			y = Math.floor(y) + offset;
		}

		return { x, y };
	};

	const updateBrushCursor = (event: PointerEvent, id: number) => {
		const canvas = canvasMap.get(id);
		if (!canvas || event.pointerType === "touch") {
			brushCursor = null;
			return;
		}

		const rect = canvas.getBoundingClientRect();
		if (
			rect.width === 0 || rect.height === 0 ||
			event.clientX < rect.left || event.clientX >= rect.right ||
			event.clientY < rect.top || event.clientY >= rect.bottom
		) {
			brushCursor = null;
			return;
		}

		const scaleX = rect.width / canvas.width;
		const scaleY = rect.height / canvas.height;
		brushCursor = {
			id,
			x: (event.clientX - rect.left) / scaleX,
			y: (event.clientY - rect.top) / scaleY,
			left: rect.left,
			top: rect.top,
			scaleX,
			scaleY,
		};
	};

	const draw = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !canvas || !drawingMap.get(id)) return;

		const { x, y } = toCanvasPoint(event, canvas);

		if (brushShape === "line") {
			const lineState = lineStartMap.get(id);
			if (lineState) {
				context.putImageData(lineState.snapshot, 0, 0);
				if (hardEdges) {
					drawHardStroke(context, lineState.start, { x, y });
				} else {
					context.beginPath();
					context.moveTo(lineState.start.x, lineState.start.y);
					context.lineTo(x, y);
					context.stroke();
				}
			}
		} else if (hardEdges) {
			const from = lastPointMap.get(id) ?? { x, y };
			drawHardStroke(context, from, { x, y });
		} else {
			context.lineTo(x, y);
			context.stroke();
			context.beginPath();
			context.moveTo(x, y);
		}

		lastPointMap.set(id, { x, y });
	};

	const startDrawing = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !canvas) return;

		activeGlyphId = id;
		if (brushShape === "fill") {
			const point = toCanvasPoint(event, canvas);
			const x = Math.floor(point.x);
			const y = Math.floor(point.y);
			if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

			const image = context.getImageData(0, 0, canvas.width, canvas.height);
			const color: [number, number, number, number] = [
				parseInt(brushColor.slice(1, 3), 16),
				parseInt(brushColor.slice(3, 5), 16),
				parseInt(brushColor.slice(5, 7), 16),
				255,
			];
			if (floodFill(image, x, y, color)) {
				context.putImageData(image, 0, 0);
				updateGlyphData(id);
			}
			return;
		}

		canvas.setPointerCapture(event.pointerId);
		drawingMap.set(id, true);

		const { x, y } = toCanvasPoint(event, canvas);

		context.beginPath();
		context.moveTo(x, y);

		// Draw immediately, even for a single click.
		if (brushShape === "line") {
			lineStartMap.set(id, {
				start: { x, y },
				snapshot: context.getImageData(0, 0, canvas.width, canvas.height),
			});
		} else if (hardEdges) {
			drawHardStroke(context, { x, y }, { x, y });
		} else {
			context.lineTo(x, y);
			context.stroke();
			context.beginPath();
			context.moveTo(x, y);
		}

		lastPointMap.set(id, { x, y });
	};

	const stopDrawing = (id: number) => {
		if (!drawingMap.get(id)) return;

		drawingMap.set(id, false);
		lastPointMap.delete(id);
		lineStartMap.delete(id);

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
		const size = effectiveResolution;
		untrack(() => {
			if (brushSize > size) brushSize = size;
			brushSizeError = "";
		});
	});

	$effect(() => {
		const currentMessage = message;

		untrack(() => {
			syncGlyphsToMessage(currentMessage);
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
			<div class="brush-tool-group" role="group" aria-label="Brush tool">
				<span class="brush-tool-label">Brush tool</span>
				<div class="brush-tool-buttons">
					{#each brushTools as tool}
						<button
							type="button"
							class="brush-tool-button"
							class:active={brushShape === tool.value}
							aria-pressed={brushShape === tool.value}
							title={tool.label}
							onclick={() => (brushShape = tool.value)}
						>
							<tool.icon size={32} aria-hidden="true" />
						</button>
					{/each}
				</div>
			</div>

			<div class="brush-tool-group" role="group" aria-label="Brush edges">
				<span>{hardEdges ? "Hard" : "Soft"}</span>
				<button
					type="button"
					class="brush-tool-button brush-edge-toggle"
					class:active={hardEdges}
					aria-label="Pixel brush edges"
					aria-pressed={hardEdges}
					title={hardEdges ? "Pixel edges (switch to smooth)" : "Smooth edges (switch to pixel)"}
					onclick={() => (hardEdges = !hardEdges)}
				>
					{#if hardEdges}
						<svg width="18" height="18" viewBox="0 0 21 21" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
							<path d="M6 0h9v3h3v3h3v9h-3v3h-3v3H6v-3H3v-3H0V6h3V3h3z" />
						</svg>
					{:else}
						<Circle size={18} fill="currentColor" stroke="none" aria-hidden="true" />
					{/if}
				</button>
			</div>

			<label>
				Brush size
				<input
					class="brush-size-input"
					type="number"
					min="1"
					max={effectiveResolution}
					step="1"
					value={brushSize}
					disabled={brushShape === "fill"}
					onchange={(event) => setBrushSize(event.currentTarget)}
					onkeydown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
				/>
			</label>

			<label class="color-control">
				Color
				<div class="color-picker">
					<input
						type="color"
						bind:value={brushColor}
						disabled={brushShape === "eraser"}
						aria-label="Choose brush color"
					/>
				</div>
			</label>

			<div class="canvas-controls">
				<div class="canvas-size-control canvas-control">
					<span class="range-control">
						<span class="canvas-control-icon" title="Canvas size">
							<Maximize2 size={20} aria-hidden="true" />
						</span>
						<input
							type="range"
							aria-label="Canvas size slider"
							min="80"
							max="256"
							step="1"
							bind:value={canvasDisplaySize}
							oninput={() => { canvasSizeError = ""; canvasResolutionError = ""; }}
						/>
						<input
							type="number"
							aria-label="Canvas size"
							aria-invalid={canvasSizeError ? "true" : undefined}
							min="80"
							max="256"
							step="1"
							value={canvasDisplaySize}
							onchange={(event) => setCanvasSize(event.currentTarget)}
							onkeydown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
						/>
					</span>
					{#if canvasSizeError}
						<span class="canvas-control-error" role="alert">{canvasSizeError}</span>
					{/if}
				</div>

				<div class="canvas-resolution-control canvas-control">
					<span class="range-control">
						<span class="canvas-control-icon" title="Canvas resolution">
							<Grid3X3 size={20} aria-hidden="true" />
						</span>
						<input
							type="range"
							aria-label="Canvas resolution slider"
							min={MIN_RESOLUTION}
							max={canvasDisplaySize}
							step="1"
							bind:value={canvasResolution}
							oninput={() => { canvasResolutionError = ""; }}
						/>
						<input
							type="number"
							aria-label="Canvas resolution"
							aria-invalid={canvasResolutionError ? "true" : undefined}
							min={MIN_RESOLUTION}
							max={canvasDisplaySize}
							step="1"
							value={effectiveResolution}
							onchange={(event) => setCanvasResolution(event.currentTarget)}
							onkeydown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
						/>
					</span>
					{#if canvasResolutionError}
						<span class="canvas-control-error" role="alert">{canvasResolutionError}</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="view-controls">
			<div class="view-mode-controls">
				<div class="view-mode-buttons" role="group" aria-label="Glyph view">
					<button
						type="button"
						class:active={viewMode === "grid"}
						aria-pressed={viewMode === "grid"}
						aria-label="Grid view"
						title="Grid view"
						onclick={() => { viewMode = "grid"; brushCursor = null; }}
					><LayoutGrid size={20} aria-hidden="true" /></button>
					<button
						type="button"
						class:active={viewMode === "gallery"}
						aria-pressed={viewMode === "gallery"}
						aria-label="Gallery view"
						title="Gallery view"
						onclick={() => { viewMode = "gallery"; brushCursor = null; }}
					><GalleryHorizontal size={20} aria-hidden="true" /></button>
				</div>
				<button
					type="button"
					onclick={downloadFont}
					disabled={glyphs.length === 0}
					aria-label="Download font (.ttf)"
					title="Download font (.ttf)"
				>
					<Download size={20} aria-hidden="true" />
				</button>
			</div>

		</div>
		{#if fontExportError}
			<p class="font-export-error" role="alert">{fontExportError}</p>
		{/if}

		<div
			class="glyph-workspace"
			class:gallery={viewMode === "gallery"}
			style={`--glyph-display-size: ${canvasDisplaySize}px; --glyph-resolution: ${effectiveResolution}`}
		>
			{#if viewMode === "gallery" && glyphs.length > 0}
				<button
					type="button"
					class="gallery-arrow"
					aria-label="Previous glyph"
					title="Previous glyph"
					disabled={activeGlyphIndex === 0}
					onclick={() => { activeGlyphId = glyphs[activeGlyphIndex - 1].id; brushCursor = null; }}
				><ChevronLeft size={20} aria-hidden="true" /></button>
			{/if}
		<div
			class="glyph-grid"
			class:gallery={viewMode === "gallery"}
		>
			{#each glyphs as glyph (glyph.id)}
				<div class="glyph-card" hidden={viewMode === "gallery" && glyph.id !== glyphs[activeGlyphIndex]?.id}>
					<span class="glyph-char">
						{glyph.char}
						{#if viewMode === "gallery" && glyph.id === glyphs[activeGlyphIndex]?.id}
							<span class="gallery-counter" aria-live="polite">
								({activeGlyphIndex + 1} / {glyphs.length})
							</span>
						{/if}
					</span>

					<canvas
						data-glyph-id={glyph.id}
						aria-label={`Draw glyph ${glyph.char}`}
						class:show-resolution-grid={viewMode === "gallery" && showResolutionGrid}
						class:fill-cursor={brushShape === "fill"}
						style={`--glyph-display-size: ${canvasDisplaySize}px`}
						use:registerCanvas={glyph.id}
						onpointerenter={(event) => updateBrushCursor(event, glyph.id)}
						onpointerdown={(event) => startDrawing(event, glyph.id)}
						onpointermove={(event) => {
							updateBrushCursor(event, glyph.id);
							draw(event, glyph.id);
						}}
						onpointerup={() => stopDrawing(glyph.id)}
						onpointerleave={() => {
							brushCursor = null;
							stopDrawing(glyph.id);
						}}
						onpointercancel={() => {
							brushCursor = null;
							stopDrawing(glyph.id);
						}}
					></canvas>

					{#if cursorPreview?.id === glyph.id}
						<div
							class="brush-cursor"
							class:round={brushShape === "round" || brushShape === "eraser"}
							style:left={`${cursorPreview.left}px`}
							style:top={`${cursorPreview.top}px`}
							style:width={`${cursorPreview.width}px`}
							style:height={`${cursorPreview.height}px`}
							aria-hidden="true"
						></div>
					{/if}

					<div class="glyph-actions">
						<button
							type="button"
							onclick={() => resetGlyph(glyph.id)}
							aria-label={`Reset glyph ${glyph.id}`}
						>
							<RotateCcw size={14} />
							Clear
						</button>
						{#if viewMode === "gallery" && glyph.id === glyphs[activeGlyphIndex]?.id}
							<label class="resolution-grid-toggle">
								<input type="checkbox" bind:checked={showResolutionGrid} />
								Grid
							</label>
						{/if}
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
			{#if viewMode === "gallery" && glyphs.length > 0}
				<button
					type="button"
					class="gallery-arrow"
					aria-label="Next glyph"
					title="Next glyph"
					disabled={activeGlyphIndex === glyphs.length - 1}
					onclick={() => { activeGlyphId = glyphs[activeGlyphIndex + 1].id; brushCursor = null; }}
				><ChevronRight size={20} aria-hidden="true" /></button>
			{/if}
		</div>
	{/if}

	<canvas bind:this={encodedCanvas} aria-label="Encoded glyph canvas"
	></canvas>
</div>

<style>
	.cipher {
		--glyph-accent: #dba359;
		--glyph-surface: #2f3436;
		--glyph-text: #b7c4d4;
		--glyph-border: rgba(183, 196, 212, 0.35);
		color: var(--glyph-text);
	}

	.controls {
		padding: 1rem;
		text-align: center;
		background-color: rgba(0, 0, 0, 0.39);
	}

	.controls label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.controls textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--glyph-border);
		border-radius: 0.375rem;
		background: var(--glyph-surface);
		color: var(--glyph-text);
		font: inherit;
		resize: vertical;
		box-sizing: border-box;
		min-height: 100px;
	}
	.brush-controls {
		--toolbar-control-height: 2.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1rem;
		background-color: rgba(0, 0, 0, 0.39);
		padding: 1rem;
	}

	.brush-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.875rem;
		text-align: center;
	}

	.canvas-controls {
		display: flex;
		flex: 0 0 100%;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}

	.canvas-control {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.875rem;
	}

	.brush-tool-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.875rem;
		color: var(--glyph-text);
		text-align: center;
	}

	.brush-tool-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.brush-tool-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		box-sizing: border-box;
		height: var(--toolbar-control-height);
		padding: 0.4rem 0.6rem;
		border: 0;
		background: transparent;
		color: var(--glyph-text);
		font: inherit;
		cursor: pointer;
	}

	.brush-tool-button:hover {
		background: transparent;
		color: var(--glyph-accent);
	}

	.brush-edge-toggle {
		align-self: center;
		width: var(--toolbar-control-height);
	}

	.brush-tool-button.active {
		background: transparent;
		color: var(--glyph-accent);
	}

	.brush-tool-button:focus-visible {
		outline: 2px solid var(--glyph-accent);
		outline-offset: 2px;
	}

	.brush-preview {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.875rem;
	}

	.brush-preview-value,
	.range-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: var(--toolbar-control-height);
	}

	.range-control input[type="range"] {
		width: 140px;
		margin: 0;
		accent-color: var(--glyph-accent);
	}

	.canvas-control-icon {
		display: flex;
		align-items: center;
	}

	.range-control input[type="number"],
	.brush-size-input {
		box-sizing: border-box;
		width: 3.2rem;
		height: var(--toolbar-control-height);
		padding: 0.4rem;
		border: 1px solid var(--glyph-border);
		border-radius: 0.375rem;
		background: var(--glyph-surface);
		color: var(--glyph-text);
		font: inherit;
	}

	.controls textarea:focus-visible,
	.range-control input:focus-visible,
	.brush-size-input:focus-visible,
	.color-picker input:focus-visible,
	.resolution-grid-toggle input:focus-visible {
		outline: 2px solid var(--glyph-accent);
		outline-offset: 2px;
	}

	.canvas-control-error {
		color: #fca5a5;
		max-width: 13rem;
	}

	.brush-dot {
		background: var(--glyph-surface);
		flex-shrink: 0;
	}

	.brush-dot.round {
		border-radius: 50%;
	}

	.brush-dot.eraser {
		border: 1px dashed var(--glyph-text);
		box-sizing: border-box;
	}

	.color-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: var(--toolbar-control-height);
	}

	.color-picker input[type="color"] {
		width: 42px;
		box-sizing: border-box;
		height: var(--toolbar-control-height);
		padding: 3px;
		border: 0px solid var(--glyph-border);
		border-radius: 6px;
		background: var(--glyph-surface);
		cursor: pointer;
		background: none;
	}

	.color-picker span {
		font-family: monospace;
		font-size: 0.875rem;
	}

	.view-controls,
	.view-mode-controls,
	.view-mode-buttons {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.view-controls {
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.view-controls button,
	.glyph-actions button,
	.gallery-arrow {
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--glyph-border);
		border-radius: 0.375rem;
		background: var(--glyph-surface);
		color: var(--glyph-text);
		font: inherit;
		cursor: pointer;
	}

	.view-mode-buttons button,
	.view-mode-controls > button,
	.gallery-arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
	}

	.view-controls button.active {
		background: var(--glyph-accent);
		border-color: var(--glyph-accent);
		color: var(--glyph-surface);
	}

	.view-controls button:not(.active):not(:disabled):hover,
	.glyph-actions button:hover,
	.gallery-arrow:not(:disabled):hover {
		background: rgba(219, 163, 89, 0.18);
		border-color: var(--glyph-accent);
		color: var(--glyph-text);
	}

	.view-controls button:focus-visible,
	.glyph-actions button:focus-visible,
	.gallery-arrow:focus-visible {
		outline: 2px solid var(--glyph-accent);
		outline-offset: 2px;
	}

	.view-controls button:disabled,
	.gallery-arrow:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.resolution-grid-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
	}

	.resolution-grid-toggle input {
		accent-color: var(--glyph-accent);
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

	.glyph-card[hidden] {
		display: none;
	}

	.glyph-grid.gallery {
		grid-template-columns: minmax(0, 1fr);
	}

	.glyph-workspace.gallery {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: min(100%, calc(max(320px, var(--glyph-display-size) * 2) + 5.5rem));
		margin: 0 auto;
	}

	.glyph-workspace.gallery .glyph-grid {
		flex: 1;
		min-width: 0;
	}

	.gallery .glyph-card {
		width: min(100%, max(320px, calc(var(--glyph-display-size) * 2)));
	}

	.glyph-char {
		font-weight: 700;
		font-size: 1.125rem;
		line-height: 1.2;
	}

	.gallery-counter {
		font-size: 0.875rem;
		font-weight: 400;
	}

	.gallery-arrow {
		flex-shrink: 0;
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
		border: 1px solid var(--glyph-text);
		border-radius: 0;
		cursor: none;
	}

	.gallery .glyph-card canvas {
		min-width: 0;
		width: 100%;
	}

	.glyph-card canvas.fill-cursor {
		cursor: crosshair;
	}

	.glyph-card canvas.show-resolution-grid {
		background-image: conic-gradient(
			#41484b 25%,
			#292e30 0 50%,
			#41484b 0 75%,
			#292e30 0
		);
		background-size: calc(200% / var(--glyph-resolution)) calc(200% / var(--glyph-resolution));
	}

	.brush-cursor {
		position: fixed;
		z-index: 1;
		box-sizing: border-box;
		border: 1px solid white;
		box-shadow: 0 0 0 1px black;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.brush-cursor.round {
		border-radius: 50%;
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

	.font-export-error {
		color: #fca5a5;
		margin: 0.5rem 0;
	}

	.cipher > canvas {
		display: block;
		max-width: 100%;
		height: auto;
		image-rendering: pixelated;
	}
</style>
