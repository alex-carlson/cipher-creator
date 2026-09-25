<script lang="ts">
	import { page } from '$app/state';

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/create', label: 'Create' },
		{ href: '/browse', label: 'Browse' },
		{ href: '/login', label: 'Login' }
	];

	const isActive = (href: string) => page.url.pathname === href;
</script>

<header class="site-header">
	<div class="brand-wrap">
		<a class="brand" href="/">Cipher Creator</a>
	</div>

	<nav class="site-nav" aria-label="Main navigation">
		{#each navItems as item}
			<a class:active={isActive(item.href)} href={item.href}>{item.label}</a>
		{/each}
	</nav>
</header>
