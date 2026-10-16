<script lang="ts">
	type SubstitutionProps = {
		key?: string;
		cipherText?: string;
	};

	let { key = "", cipherText: initialCipherText = "" }: SubstitutionProps =
		$props();

	const alphabet = "abcdefghijklmnopqrstuvwxyz";

	let userKey = $state("");
	let cipherText = $state(initialCipherText);

	$effect(() => {
		cipherText = initialCipherText;
	});

	const buildCipherAlphabet = (keyValue: string) => {
		const keyChars: string[] = [];

		for (const char of keyValue.toLowerCase()) {
			if (alphabet.includes(char) && !keyChars.includes(char)) {
				keyChars.push(char);
			}
		}

		const remaining = [...alphabet].filter(
			(char) => !keyChars.includes(char),
		);

		return [...keyChars, ...remaining].join("");
	};

	const decodeWithKey = (text: string, keyValue: string) => {
		const cipherAlphabet = buildCipherAlphabet(keyValue);
		const lookup = new Map<string, string>();

		for (let index = 0; index < alphabet.length; index += 1) {
			const plain = alphabet[index];
			const cipher = cipherAlphabet[index];

			lookup.set(cipher, plain);
			lookup.set(cipher.toUpperCase(), plain.toUpperCase());
		}

		return [...text].map((char) => lookup.get(char) ?? char).join("");
	};

	const decodeText = $derived(decodeWithKey(cipherText, userKey));

	// Derive the expected plaintext using the correct key.
	const expectedPlainText = $derived(decodeWithKey(cipherText, key));

	const isCorrect = $derived(
		userKey.trim().toLowerCase() === key.trim().toLowerCase(),
	);

	const isDecodedCorrectly = $derived(
		decodeText.trim().toLowerCase() ===
			expectedPlainText.trim().toLowerCase(),
	);
</script>

<section class="tool-panel">
	<h2>Substitution Solver</h2>

	<div class="cipher-flow">
		<div class="message-card encoded-card">
			<span class="step-label">ENCODED MESSAGE</span>
			<p class="cipher-text">{cipherText}</p>
		</div>

		<div class="flow-arrow" aria-hidden="true">↓</div>

		<div class="key-card">
			<label for="substitution-key">ENTER YOUR KEY</label>
			<input
				id="substitution-key"
				bind:value={userKey}
				type="text"
				placeholder="Enter your key..."
				autocomplete="off"
				spellcheck="false"
			/>

			{#if userKey.length > 0}
				{#if isCorrect}
					<p class="feedback correct">✓ Correct key!</p>
				{:else if isDecodedCorrectly}
					<p class="feedback correct">✓ Close enough!</p>
				{/if}
			{/if}
		</div>

		<div class="flow-arrow" aria-hidden="true">↓</div>

		<div class="message-card decoded-card">
			<span class="step-label">DECODED MESSAGE</span>
			<p class="decoded-text">
				{decodeText || "Your decoded message will appear here."}
			</p>
		</div>
	</div>
</section>

<style>
	.tool-panel {
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding: 1.5rem;
		box-sizing: border-box;
	}

	.tool-panel h2 {
		margin: 0 0 1.5rem;
		font-size: 1.6rem;
		text-align: center;
	}

	.cipher-flow {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.message-card,
	.key-card {
		padding: 1.25rem;
		box-sizing: border-box;
		background-color: #212425;
		color: #ffffff;
		border-radius: 15px;
	}

	.step-label,
	.key-card label {
		display: block;
		margin-bottom: 0.75rem;
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.07em;
	}

	.cipher-text,
	.decoded-text {
		margin: 0;
		font-size: 1.15rem;
		line-height: 1.8;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	.cipher-text {
		font-family: monospace;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.decoded-text {
		font-weight: 600;
		color: #065f46;
	}

	.key-card input {
		display: block;
		width: 100%;
		padding: 0.85rem 1rem;
		border: 2px solid #93c5fd;
		border-radius: 8px;
		background: #ffffff;
		color: #111827;
		font: inherit;
		font-size: 1.05rem;
		box-sizing: border-box;
	}

	.key-card input:focus {
		outline: 3px solid #bfdbfe;
		border-color: #2563eb;
	}

	.flow-arrow {
		display: flex;
		justify-content: center;
		align-items: center;
		color: #6b7280;
		font-size: 1.75rem;
		font-weight: 800;
		line-height: 1;
	}

	.feedback {
		margin: 0.75rem 0 0;
		padding: 0.65rem 0.8rem;
		border-radius: 6px;
		font-weight: 700;
	}

	.feedback.correct {
		background: #d1fae5;
		color: #065f46;
	}

	.feedback.hint {
		background: #fef3c7;
		color: #92400e;
	}

	@media (max-width: 480px) {
		.tool-panel {
			padding: 1rem;
		}

		.message-card,
		.key-card {
			padding: 1rem;
		}

		.cipher-text,
		.decoded-text {
			font-size: 1rem;
		}
	}
</style>
