<script lang="ts">
	import { onMount } from "svelte";
	import { Lock } from "lucide-svelte";
	import { collection, getDocs, orderBy, query } from "firebase/firestore";
	import { db, firebaseReady } from "$lib/firebase";
	import { getCipherComplexity } from "$lib/cipher-parser";
	import { formatRelativeDate } from "$lib/formatting";

	type CipherRecord = {
		id: string;
		name: string;
		codes?: Array<{ type?: string; [key: string]: unknown }>;
		tools?: string[];
		createdAt?: {
			seconds?: number;
			nanoseconds?: number;
			toDate?: () => Date;
		};
		customGlyph?: Record<string, unknown>;
		substitution?: Record<string, unknown>;
	};

	let ciphers = $state<CipherRecord[]>([]);
	let loading = $state(true);
	let errorMessage = $state("");

	onMount(async () => {
		if (!firebaseReady || !db) {
			errorMessage = "Firebase is not configured yet.";
			loading = false;
			return;
		}

		try {
			const snapshot = await getDocs(
				query(collection(db, "ciphers"), orderBy("createdAt", "desc")),
			);

			ciphers = snapshot.docs.map((doc) => ({
				id: doc.id,
				...(doc.data() as Omit<CipherRecord, "id">),
			}));
		} catch (loadError) {
			console.error("Failed to load ciphers", loadError);
			errorMessage = "Unable to load ciphers right now.";
		} finally {
			loading = false;
		}
	});

	function getDifficulty(cipher: CipherRecord): number {
		const complexity = getCipherComplexity(cipher);

		return Math.max(1, Math.min(5, Math.round(complexity)));
	}
</script>

<svelte:head>
	<title>Browse Ciphers</title>
</svelte:head>

<main class="page">
	<h1>Browse created ciphers</h1>

	{#if loading}
		<p>Loading ciphers...</p>
	{:else if errorMessage}
		<p class="error">{errorMessage}</p>
	{:else if ciphers.length === 0}
		<p>No ciphers have been published yet.</p>
	{:else}
		<ul class="cipher-list">
			{#each ciphers as cipher (cipher.id)}
				<li class="cipher-card">
					<h2>
						<a href={`/${cipher.id}`}>
							{cipher.name || "Untitled cipher"}
						</a>
					</h2>

					<p class="meta">
						Created: {formatRelativeDate(cipher.createdAt)}
					</p>

					<div
						class="complexity"
						role="img"
						aria-label={`Difficulty: ${getDifficulty(cipher)} out of 5`}
						title={`Difficulty: ${getDifficulty(cipher)} out of 5`}
					>
						{#each Array.from({ length: 5 }, (_, i) => i + 1) as level (level)}
							<Lock
								size={16}
								strokeWidth={2}
								class={level <= getDifficulty(cipher)
									? "filled"
									: "muted"}
							/>
						{/each}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.complexity {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 8px;
	}

	.complexity :global(svg) {
		flex-shrink: 0;
	}

	.complexity :global(svg.filled) {
		color: var(--accent, #dba359);
	}

	.complexity :global(svg.muted) {
		color: var(--muted, #68717a);
		opacity: 0.4;
	}
</style>
