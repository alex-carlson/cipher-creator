<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Plus, RotateCcw, Trash2 } from 'lucide-svelte';

	type Glyph = {
		id: number;
		char: string;
		dataUrl: string;
	};

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

	const renderEncodedCanvas = () => {
		if (!encodedCanvas) return;

		const context = encodedCanvas.getContext('2d');
		if (!context) return;

		const lookup = new Map<string, string>();
		const cleanAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		for (let index = 0; index < cleanAlphabet.length; index += 1) {
			const plain = cleanAlphabet[index];
			const glyphMatch = glyphs.find((glyph) => glyph.char.toUpperCase() === plain);
			const cipher = glyphMatch?.char ?? plain;
			lookup.set(plain, cipher);
		}

		const encodedChars = [...message.toUpperCase()].map((char) => lookup.get(char) ?? char);
		const glyphCellWidth = 64;
		const glyphCellHeight = 64;
		const gap = 8;
		const maxPerRow = 12;
		const rowCount = Math.max(1, Math.ceil(encodedChars.length / maxPerRow));
		const canvasWidth = Math.max(Math.min(encodedChars.length, maxPerRow) * glyphCellWidth + (Math.min(encodedChars.length, maxPerRow) - 1) * gap, glyphCellWidth);
		const canvasHeight = rowCount * glyphCellHeight + (rowCount - 1) * gap;

		encodedCanvas.width = canvasWidth;
		encodedCanvas.height = canvasHeight;
		context.clearRect(0, 0, encodedCanvas.width, encodedCanvas.height);
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, encodedCanvas.width, encodedCanvas.height);

		encodedChars.forEach((char, index) => {
			const row = Math.floor(index / maxPerRow);
			const col = index % maxPerRow;
			const x = col * (glyphCellWidth + gap);
			const y = row * (glyphCellHeight + gap);

			const glyph = glyphs.find((entry) => entry.char.toUpperCase() === char.toUpperCase());
			if (!glyph) {
				context.fillStyle = '#f9a8d4';
				context.fillRect(x + 8, y + 8, glyphCellWidth - 16, glyphCellHeight - 16);
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
				context.fillText(glyph.char, x + glyphCellWidth / 2, y + glyphCellHeight / 2);
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
		const cleanAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const glyphChars = glyphs.map((glyph) => glyph.char.trim()).filter(Boolean);
		const substitution = new Map<string, string>();

		for (let index = 0; index < cleanAlphabet.length; index += 1) {
			const plain = cleanAlphabet[index];
			const cipher = glyphChars[index] ?? plain;
			substitution.set(plain, cipher);
		}

		return [...message.toUpperCase()]
			.map((char) => substitution.get(char) ?? char)
			.join('');
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

<section>
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
					<input bind:value={glyph.char} type="text" maxlength="1" />
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
</section>