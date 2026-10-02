<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { Plus, RotateCcw, Trash2 } from 'lucide-svelte';

	type Glyph = {
		id: number;
		char: string;
		dataUrl: string;
	};

	type CustomGlyphConfig = {
		message: string;
		glyphs: Glyph[];
	};

	const dispatch = createEventDispatcher<{ cipherChange: CustomGlyphConfig }>();
	const BRUSH_SIZE = 4;
	let encodedCanvas: HTMLCanvasElement;
	let message = $state('HELLO');
	let glyphs = $state<Glyph[]>([
		{ id: 1, char: 'A', dataUrl: '' },
		{ id: 2, char: 'B', dataUrl: '' },
		{ id: 3, char: 'C', dataUrl: '' }
	]);
	let nextId = $state(Math.max(...glyphs.map((glyph) => glyph.id), 0) + 1);

	const canvasMap = new Map<number, HTMLCanvasElement>();
	const contextMap = new Map<number, CanvasRenderingContext2D>();
	const drawingMap = new Map<number, boolean>();

	const resetCanvas = (canvas: HTMLCanvasElement, glyphId: number) => {
		const context = canvas.getContext('2d');
		if (!context) return;

		context.lineCap = 'round';
		context.lineJoin = 'round';
		context.lineWidth = BRUSH_SIZE;
		context.strokeStyle = '#111827';
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, canvas.width, canvas.height);

		contextMap.set(glyphId, context);
	};

	const registerCanvas = (node: HTMLCanvasElement, glyphId: number) => {
		canvasMap.set(glyphId, node);
		resetCanvas(node, glyphId);
		return {
			destroy() {
				canvasMap.delete(glyphId);
				contextMap.delete(glyphId);
			}
		};
	};

	const addGlyph = async () => {
		const id = nextId;
		nextId += 1;
		const char = String.fromCharCode(65 + ((glyphs.length + 1) % 26));
		glyphs = [...glyphs, { id, char, dataUrl: '' }];
		await tick();
		const nextCanvas = canvasMap.get(id);
		if (nextCanvas) {
			resetCanvas(nextCanvas, id);
		}
		renderEncodedCanvas();
	};

	const resetGlyph = (id: number) => {
		const canvas = canvasMap.get(id);
		if (!canvas) return;
		resetCanvas(canvas, id);
		renderEncodedCanvas();
	};

	const removeGlyph = (id: number) => {
		if (glyphs.length <= 1) return;
		glyphs = glyphs.filter((glyph) => glyph.id !== id);
		canvasMap.delete(id);
		contextMap.delete(id);
		drawingMap.delete(id);
		renderEncodedCanvas();
	};

	const updateGlyphData = (id: number) => {
		const canvas = canvasMap.get(id);
		if (!canvas) return;

		glyphs = glyphs.map((glyph) =>
			glyph.id === id ? { ...glyph, dataUrl: canvas.toDataURL('image/png') } : glyph
		);
		renderEncodedCanvas();
	};

	const encodeMessage = (value: string) => {
		const chars = [...value];
		const configuredGlyphs = glyphs
			.map((glyph) => ({ glyph, symbol: glyph.char.trim() }))
			.filter(({ symbol }) => symbol.length > 0);
		const singleCharacterGlyphs = configuredGlyphs.filter(({ symbol }) => [...symbol].length === 1);
		const multiCharacterGlyphs = configuredGlyphs
			.filter(({ symbol }) => [...symbol].length > 1)
			.sort((left, right) => [...right.symbol].length - [...left.symbol].length);
		const encoded: Array<{ glyph?: Glyph; symbol: string; start: number; end: number }> = [];

		for (let index = 0; index < chars.length;) {
			const singleMatch = singleCharacterGlyphs.find(
				({ symbol }) => chars[index].toUpperCase() === symbol.toUpperCase()
			);

			if (singleMatch) {
				encoded.push({ glyph: singleMatch.glyph, symbol: singleMatch.symbol, start: index, end: index + 1 });
				index += 1;
				continue;
			}

			const multiMatch = multiCharacterGlyphs.find(({ symbol }) => {
				const symbolLength = [...symbol].length;
				return index + 1 >= symbolLength &&
					chars.slice(index + 1 - symbolLength, index + 1).join('').toUpperCase() === symbol.toUpperCase();
			});
			if (multiMatch) {
				const start = index + 1 - [...multiMatch.symbol].length;
				while (encoded.length && encoded[encoded.length - 1].end > start) {
					encoded.pop();
				}
				encoded.push({ glyph: multiMatch.glyph, symbol: multiMatch.symbol, start, end: index + 1 });
				index += 1;
				continue;
			}

			const char = chars[index];
			const alphabetIndex = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(char.toUpperCase());
			const fallbackGlyph = alphabetIndex >= 0 ? glyphs[alphabetIndex] : undefined;
			const fallbackSymbol = fallbackGlyph?.char.trim();
			encoded.push({
				glyph: fallbackSymbol ? fallbackGlyph : undefined,
				symbol: fallbackSymbol || char,
				start: index,
				end: index + 1
			});
			index += 1;
		}

		return encoded;
	};

	const renderEncodedCanvas = () => {
		if (!encodedCanvas) return;

		const context = encodedCanvas.getContext('2d');
		if (!context) return;

		const encodedGlyphs = encodeMessage(message.toUpperCase());
		const glyphCellWidth = 64;
		const glyphCellHeight = 64;
		const gap = 8;
		const maxPerRow = 12;
		const rowCount = Math.max(1, Math.ceil(encodedGlyphs.length / maxPerRow));
		const canvasWidth = Math.max(Math.min(encodedGlyphs.length, maxPerRow) * glyphCellWidth + (Math.min(encodedGlyphs.length, maxPerRow) - 1) * gap, glyphCellWidth);
		const canvasHeight = rowCount * glyphCellHeight + (rowCount - 1) * gap;

		encodedCanvas.width = canvasWidth;
		encodedCanvas.height = canvasHeight;
		context.clearRect(0, 0, encodedCanvas.width, encodedCanvas.height);
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, encodedCanvas.width, encodedCanvas.height);

		encodedGlyphs.forEach(({ glyph, symbol }, index) => {
			const row = Math.floor(index / maxPerRow);
			const col = index % maxPerRow;
			const x = col * (glyphCellWidth + gap);
			const y = row * (glyphCellHeight + gap);

			if (!glyph) {
				context.fillStyle = '#111827';
				context.font = `${Math.min(24, 48 / [...symbol].length)}px sans-serif`;
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.fillText(symbol, x + glyphCellWidth / 2, y + glyphCellHeight / 2, glyphCellWidth - 4);
				return;
			}

			const sourceCanvas = canvasMap.get(glyph.id);
			if (sourceCanvas) {
				const drawWidth = 64;
				const drawHeight = 64;
				const drawX = x + (glyphCellWidth - drawWidth) / 2;
				const drawY = y + (glyphCellHeight - drawHeight) / 2;
				context.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
			} else {
				context.fillStyle = '#111827';
				context.font = '24px sans-serif';
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.font = `${Math.min(24, 48 / [...symbol].length)}px sans-serif`;
				context.fillText(symbol, x + glyphCellWidth / 2, y + glyphCellHeight / 2, glyphCellWidth - 4);
			}
		});
	};

	const draw = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const isDrawing = drawingMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !isDrawing || !canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

		context.lineTo(x, y);
		context.stroke();
		context.beginPath();
		context.moveTo(x, y);
		updateGlyphData(id);
	};

	const startDrawing = (event: PointerEvent, id: number) => {
		const context = contextMap.get(id);
		const canvas = canvasMap.get(id);
		if (!context || !canvas) return;

		drawingMap.set(id, true);
		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
		context.beginPath();
		context.moveTo(x, y);
		context.lineTo(x, y);
		context.stroke();
		updateGlyphData(id);
	};

	const stopDrawing = (id: number) => {
		drawingMap.set(id, false);
		const context = contextMap.get(id);
		if (!context) return;
		context.beginPath();
		renderEncodedCanvas();
	};

	const cipherText = $derived.by(() => {
		return encodeMessage(message.toUpperCase())
			.map(({ symbol }) => symbol)
			.join('');
	});

	$effect(() => {
		renderEncodedCanvas();
	});

	$effect(() => {
		dispatch('cipherChange', {
			message,
			glyphs
		});
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
		<button type="button" on:click={addGlyph} aria-label="Add glyph canvas">
			<Plus size={16} />
			<span>Add canvas</span>
		</button>
		<input bind:value={message} type="text" name="message" id="message" />
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
					<button type="button" on:click={() => resetGlyph(glyph.id)} aria-label={`Reset glyph ${glyph.id}`}>
						<RotateCcw size={14} />
					</button>
					<button type="button" on:click={() => removeGlyph(glyph.id)} aria-label={`Remove glyph ${glyph.id}`}>
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

	<canvas bind:this={encodedCanvas} aria-label="Encoded glyph canvas"></canvas>

</div>