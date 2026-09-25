<script lang="ts">
	import { onMount } from 'svelte';
	import { EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
	import { auth, firebaseReady } from '$lib/firebase';

	let userEmail = $state('');
	let authUi: any = null;
	let isReady = $state(false);

	const logout = async () => {
		if (!auth) return;
		await signOut(auth);
		userEmail = '';
	};

	onMount(() => {
		if (!firebaseReady || !auth) {
			isReady = true;
			return;
		}

		onAuthStateChanged(auth, (user) => {
			userEmail = user?.email ?? '';
			isReady = true;
		});

		if (typeof window === 'undefined') {
			return;
		}

		void (async () => {
			const firebaseui = await import('firebaseui');
			await import('firebaseui/dist/firebaseui.css');

			const uiConfig: Record<string, unknown> = {
				signInFlow: 'popup',
				signInOptions: [
					EmailAuthProvider.PROVIDER_ID,
					GoogleAuthProvider.PROVIDER_ID
				],
				callbacks: {
					signInSuccessWithAuthResult: () => false,
				}
			};

			authUi = new firebaseui.auth.AuthUI(auth);
			authUi.start('#firebaseui-auth-container', uiConfig);
		})();

		return () => {
			authUi?.delete();
		};
	});
</script>

<svelte:head>
	<title>Login / Register</title>
</svelte:head>

<main class="auth-card">
	{#if !isReady}
		<p>Loading authentication...</p>
	{:else if userEmail}
		<h1>Welcome back</h1>
		<p>Signed in as {userEmail}</p>
		<div class="auth-actions">
			<button type="button" onclick={logout}>Sign out</button>
		</div>
	{:else}
		<h1>Login / Register</h1>
		<div id="firebaseui-auth-container"></div>
	{/if}
</main>
