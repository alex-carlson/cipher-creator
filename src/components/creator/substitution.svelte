<script lang="ts">
	import { createEventDispatcher, untrack } from "svelte";

	type SubstitutionConfig = {
		alphabet: string;
		key: string;
		message: string;
		cipherText: string;
	};

	const dispatch = createEventDispatcher<{
		cipherChange: SubstitutionConfig;
	}>();

	const alphabet = "abcdefghijklmnopqrstuvwxyz";

	let key = $state("key");
	let message = $state("");

	const normalizedKey = $derived(key.toLowerCase());

	const repeatedCharacters = $derived.by(() => {
		const seen = new Set<string>();
		const repeated = new Set<string>();

		for (const char of normalizedKey) {
			if (!/[a-z]/.test(char)) continue;

			if (seen.has(char)) {
				repeated.add(char);
			} else {
				seen.add(char);
			}
		}

		return [...repeated];
	});

	const keyHasDuplicates = $derived(repeatedCharacters.length > 0);

	const encryptionKey = $derived(
		normalizedKey.replace(/[^a-z]/g, "") +
			[...alphabet]
				.filter((char) => !normalizedKey.includes(char))
				.join(""),
	);

	const cipherText = $derived.by(() => {
		if (keyHasDuplicates) return "";

		const lookup = new Map<string, string>();

		for (let i = 0; i < alphabet.length; i++) {
			lookup.set(alphabet[i], encryptionKey[i]);
			lookup.set(
				alphabet[i].toUpperCase(),
				encryptionKey[i].toUpperCase(),
			);
		}

		return [...message].map((char) => lookup.get(char) ?? char).join("");
	});

	let lastDispatched = "";

	$effect(() => {
		const config: SubstitutionConfig = {
			alphabet,
			key,
			message,
			cipherText,
		};

		const serialized = JSON.stringify(config);

		if (serialized === lastDispatched) return;

		lastDispatched = serialized;

		untrack(() => {
			dispatch("cipherChange", config);
		});
	});
</script>

<div class="cipher">
	<label for="key">Key</label>
	<input
		bind:value={key}
		type="text"
		name="key"
		id="key"
		aria-invalid={keyHasDuplicates}
		aria-describedby={keyHasDuplicates ? "key-error" : undefined}
	/>

	{#if keyHasDuplicates}
		<p id="key-error" class="error" role="alert">
			Your key contains repeated characters:
			{repeatedCharacters.join(", ")}. Please use each letter only once.
		</p>
	{/if}

	<label for="encryption-key">Encryption key</label>
	<span id="encryption-key" class="encryption-key">
		{encryptionKey}
	</span>

	<label for="message">Message</label>
	<input bind:value={message} type="text" name="message" id="message" />

	<label for="cipher-text">Encrypted message</label>
	<span id="cipher-text">{cipherText}</span>
</div>

<style>
	.cipher {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.encryption-key {
		overflow-wrap: anywhere;
		font-family: monospace;
	}

	.error {
		color: #dc2626;
		margin: 0;
	}
</style>
