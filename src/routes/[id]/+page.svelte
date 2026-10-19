<script lang="ts">
	import { onMount } from "svelte";
	import { doc, getDoc } from "firebase/firestore";
	import { page } from "$app/state";
	import { db, firebaseReady } from "$lib/firebase";
	import SubstitutionAnswerer from "../../components/answerer/substitution.svelte";
	import CustomGlyphAnswerer from "../../components/answerer/custom-glyph.svelte";
	import MorseAnswerer from "../../components/answerer/morse.svelte";
	import PolybiusAnswerer from "../../components/answerer/polybius.svelte";
	
	type CodeEntry = {
		type?: string;
		alphabet?: string;
		key?: string;
		message?: string;
		cipherText?: string;
		glyphs?: Array<{ id: number; char: string; dataUrl: string }>;
	};

	type SavedCipher = {
		name?: string;
		codes?: CodeEntry[];
		tools?: string[];
		substitution?: CodeEntry;
		customGlyph?: {
			message?: string;
			glyphs?: Array<{ id: number; char: string; dataUrl: string }>;
		};
		morse?: {
			message?: string;
			cipherText?: string;
		};
		polybius?: CodeEntry; // Added to map explicit standalone polybius configurations
	};

	const cipherId = $derived(page.params.id ?? "");
	let cipher = $state<SavedCipher | null>(null);
	let loading = $state(true);
	let errorMessage = $state("");

	const getCodeType = (entry: CodeEntry | undefined) => {
		if (!entry) return "";

		const value = String(entry.type ?? "").toLowerCase();

		if (value === "substitution") return "substitution";

		if (value === "custom-glyph" || value === "customglyph") {
			return "custom-glyph";
		}

		if (
			value === "morse" ||
			value === "morse-code" ||
			value === "morsecode"
		) {
			return "morse";
		}

		if (value === "polybius") {
			return "polybius"; // Added explicit helper conversion map string
		}

		return "";
	};

	onMount(async () => {
		if (!cipherId) {
			errorMessage = "Cipher id is missing.";
			loading = false;
			return;
		}

		if (!firebaseReady || !db) {
			errorMessage = "Firebase is not configured yet.";
			loading = false;
			return;
		}

		try {
			const ref = doc(db, "ciphers", cipherId);
			const snapshot = await getDoc(ref);

			if (!snapshot.exists()) {
				errorMessage = "Cipher not found.";
				cipher = null;
				return;
			}

			cipher = snapshot.data() as SavedCipher;
		} catch (loadError) {
			console.error("Failed to load cipher", loadError);
			errorMessage = "Unable to load this cipher.";
		} finally {
			loading = false;
		}
	});
</script>

<section class="page-shell">
	{#if loading}
		<h1>Loading cipher...</h1>
	{:else if errorMessage}
		<h1>Unable to load cipher</h1>
		<p>{errorMessage}</p>
	{:else if !cipher}
		<h1>Cipher not found</h1>
	{:else}
		<h1>{cipher.name || "Untitled cipher"}</h1>
		<p>
			Use the cipher tools below to decode or interpret this saved puzzle.
		</p>

		{#if cipher.codes?.length}
			{#each cipher.codes as entry}
				{#if getCodeType(entry) === "substitution"}
					<SubstitutionAnswerer
						alphabet={entry.alphabet ??
							"abcdefghijklmnopqrstuvwxyz"}
						key={entry.key ?? "key"}
						cipherText={entry.cipherText ?? entry.message ?? ""}
					/>
				{:else if getCodeType(entry) === "custom-glyph"}
					<CustomGlyphAnswerer
						message={entry.message ?? ""}
						glyphs={entry.glyphs ?? []}
					/>
				{:else if getCodeType(entry) === "morse"}
					<MorseAnswerer
						cipherText={entry.cipherText ?? entry.message ?? ""}
					/>
				{:else if getCodeType(entry) === "polybius"}
					<PolybiusAnswerer
						key={entry.key ?? "key"}
						cipherText={entry.cipherText ?? entry.message ?? ""}
					/>
				{/if}
			{/each}
		{:else}
			{#if cipher.tools?.includes("substitution")}
				<SubstitutionAnswerer
					alphabet={cipher.substitution?.alphabet ??
						"abcdefghijklmnopqrstuvwxyz"}
					key={cipher.substitution?.key ?? "key"}
					cipherText={cipher.substitution?.cipherText ??
						cipher.substitution?.message ??
						""}
				/>
			{/if}

			{#if cipher.tools?.includes("custom-glyph") || cipher.tools?.includes("customGlyph")}
				<CustomGlyphAnswerer
					message={cipher.customGlyph?.message ?? ""}
					glyphs={cipher.customGlyph?.glyphs ?? []}
				/>
			{/if}

			{#if cipher.tools?.includes("morse") || cipher.tools?.includes("morse-code")}
				<MorseAnswerer
					cipherText={cipher.morse?.cipherText ??
						cipher.morse?.message ??
						""}
				/>
			{/if}

			{#if cipher.tools?.includes("polybius")}
				<PolybiusAnswerer
					key={cipher.polybius?.key ?? "key"}
					cipherText={cipher.polybius?.cipherText ??
						cipher.polybius?.message ??
						""}
				/>
			{/if}
		{/if}
	{/if}
</section>
