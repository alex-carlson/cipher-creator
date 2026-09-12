<script lang="ts">
	let alphabet = $state('abcdefghijklmnopqrstuvwxyz');
	let key = $state('key');
	let message = $state('');

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

	const cipherText = $derived.by(() => {
		const alphabetChars = [...new Set(alphabet.split(''))];
		const cipherAlphabet = buildCipherAlphabet(alphabet, key);
		if (!alphabetChars.length || !cipherAlphabet) return '';

		const lookup = new Map<string, string>();
		for (let i = 0; i < alphabetChars.length; i += 1) {
			const plain = alphabetChars[i];
			const cipher = cipherAlphabet[i] ?? plain;
			lookup.set(plain.toLowerCase(), cipher.toLowerCase());
			lookup.set(plain.toUpperCase(), cipher.toUpperCase());
		}

		return [...message]
			.map((char) => lookup.get(char) ?? char)
			.join('');
	});
</script>

<input bind:value={alphabet} type="text" name="alphabet" id="alphabet" />
<input bind:value={key} type="text" name="key" id="key" />

<input bind:value={message} type="text" name="message" id="message" />
<span id="cipher-text">{cipherText}</span>