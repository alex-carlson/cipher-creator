<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.scss';
	import Header from '../components/Header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Cipher Creator</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&family=Germania+One&display=swap" rel="stylesheet">
</svelte:head>

<Header />
<div class="container">
	{@render children()}
</div>
