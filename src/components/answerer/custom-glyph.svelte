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
		return glyphList
			.slice(0, cleanAlphabet.length)
			.flatMap((glyph, index) => {
				const symbol = glyph.char.trim().toUpperCase();
				return symbol ? [{ symbol, plain: cleanAlphabet[index], length: [...symbol].length }] : [];
			})
			.sort((left, right) => left.length - right.length);
	});

	const decodedText = $derived.by(() => {
		const chars = [...encodedText];
		let decoded = '';

		for (let index = 0; index < chars.length;) {
			const match = decodeMap.find(({ symbol, length }) =>
				chars.slice(index, index + length).join('').toUpperCase() === symbol
			);
			if (!match) {
				decoded += chars[index];
				index += 1;
				continue;
			}

			const token = chars.slice(index, index + match.length).join('');
			decoded += token === token.toLowerCase() ? match.plain.toLowerCase() : match.plain;
			index += match.length;
		}

		return decoded;
	});
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
