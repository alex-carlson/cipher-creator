<script lang="ts">
	type Glyph = {
		id: number;
		char: string;
		dataUrl: string;
	};

	type CustomGlyphProps = {
		glyphs?: Glyph[];
		message?: string;
	};

	let { glyphs: glyphList = [], message: initialMessage = '' }: CustomGlyphProps = $props();
	let encodedText = $state(initialMessage);

	const glyphEntries = $derived.by(() => (glyphList ?? []).filter((glyph) => glyph.char.trim()));

	const decodeMap = $derived.by(() => {
		const cleanAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const glyphChars = glyphEntries.map((glyph) => glyph.char.trim()).filter(Boolean);
		const lookup = new Map<string, string>();

		for (let index = 0; index < cleanAlphabet.length; index += 1) {
			const plain = cleanAlphabet[index];
			const cipher = glyphChars[index] ?? plain;
			lookup.set(cipher.toUpperCase(), plain);
			lookup.set(cipher.toLowerCase(), plain.toLowerCase());
		}

		return lookup;
	});

	const decodedText = $derived.by(() =>
		[...encodedText]
			.map((char) => decodeMap.get(char) ?? char)
			.join('')
	);
</script>

<section class="tool-panel">
	<h2>Custom Glyph Solver</h2>

	{#if glyphEntries.length}
		<div class="glyph-preview-grid">
			{#each glyphEntries as glyph (glyph.id)}
				<div class="glyph-preview-card">
					{#if glyph.dataUrl}
						<img src={glyph.dataUrl} alt={`Glyph for ${glyph.char}`} />
					{:else}
						<span class="glyph-placeholder">{glyph.char || '?'}</span>
					{/if}
					<strong>{glyph.char}</strong>
				</div>
			{/each}
		</div>
	{/if}

	<label>
		Encoded text
		<input bind:value={encodedText} type="text" placeholder="Enter the encoded message" />
	</label>

	<div class="output-block">
		<strong>Decoded text:</strong>
		<p>{decodedText || 'Your decoded message will appear here.'}</p>
	</div>
</section>
