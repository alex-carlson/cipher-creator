<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, orderBy, query } from 'firebase/firestore';
	import { db, firebaseReady } from '$lib/firebase';

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
	let errorMessage = $state('');

	const formatDate = (value?: CipherRecord['createdAt']) => {
		if (!value) return 'Recently';
		if (typeof value.toDate === 'function') {
			return value.toDate().toLocaleString();
		}
		return 'Recently';
	};

	onMount(async () => {
		if (!firebaseReady || !db) {
			errorMessage = 'Firebase is not configured yet.';
			loading = false;
			return;
		}

		try {
			const snapshot = await getDocs(query(collection(db, 'ciphers'), orderBy('createdAt', 'desc')));
			ciphers = snapshot.docs.map((doc) => ({
				id: doc.id,
				...(doc.data() as Omit<CipherRecord, 'id'>)
			}));
		} catch (loadError) {
			console.error('Failed to load ciphers', loadError);
			errorMessage = 'Unable to load ciphers right now.';
		} finally {
			loading = false;
		}
	});
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
						<a href={`/${cipher.id}`}>{cipher.name || 'Untitled cipher'}</a>
					</h2>
					<p class="meta">Created: {formatDate(cipher.createdAt)}</p>
					{#if cipher.codes?.length}
						<p class="tools">Tools: {cipher.codes.map((code) => code.type ?? 'code').join(', ')}</p>
					{:else if cipher.tools?.length}
						<p class="tools">Tools: {cipher.tools.join(', ')}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>
