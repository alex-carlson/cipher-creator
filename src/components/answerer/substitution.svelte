<script lang="ts">
	type SubstitutionProps = {
		alphabet?: string;
		key?: string;
		cipherText?: string;
	};

	let { alphabet: initialAlphabet = 'abcdefghijklmnopqrstuvwxyz', key: initialKey = 'key', cipherText: initialCipherText = '' }: SubstitutionProps = $props();

	const buildCipherAlphabet = (alphabetValue: string, keyValue: string) => {
		const normalizedAlphabet = [...new Set(alphabetValue.split(''))].join('');
		if (!normalizedAlphabet) return '';

		const keyChars: string[] = [];
		for (const char of keyValue) {
			if (normalizedAlphabet.toLowerCase().includes(char.toLowerCase()) && !keyChars.some((item) => item.toLowerCase() === char.toLowerCase())) {
				keyChars.push(char);
			}
		}

		const remaining = [...normalizedAlphabet].filter(
			(char) => !keyChars.some((item) => item.toLowerCase() === char.toLowerCase())
		);

		return [...keyChars, ...remaining].join('');
	};

	let alphabet = $state(initialAlphabet);
	let key = $state(initialKey);
	let cipherText = $state(initialCipherText);

	$effect(() => {
		alphabet = initialAlphabet;
		key = initialKey;
		cipherText = initialCipherText;
	});

	const decodeText = $derived.by(() => {
		const plainAlphabet = [...new Set(alphabet.split(''))];
		const cipherAlphabet = buildCipherAlphabet(alphabet, key);
		if (!plainAlphabet.length || !cipherAlphabet) return cipherText;

		const lookup = new Map<string, string>();
		for (let index = 0; index < plainAlphabet.length; index += 1) {
			const plain = plainAlphabet[index];
			const cipher = cipherAlphabet[index] ?? plain;
			lookup.set(cipher.toLowerCase(), plain.toLowerCase());
			lookup.set(cipher.toUpperCase(), plain.toUpperCase());
		}

		return [...cipherText]
			.map((char) => lookup.get(char) ?? char)
			.join('');
	});
</script>

<section class="tool-panel">
	<h2>Substitution Solver</h2>

    <h3>{cipherText}</h3>

	<label>
		Alphabet
		<input bind:value={alphabet} type="text" />
	</label>

	<label>
		Key
		<input bind:value={key} type="text" />
	</label>

	<div class="output-block">
		<strong>Decoded text:</strong>
		<p>{decodeText || 'Your decoded message will appear here.'}</p>
	</div>
</section>
