<script lang="ts">
	import { page } from "$app/state";
	import AuthModal from "./AuthModal.svelte";

	let showAuthModal = $state(false);

	const navItems = [
		{ href: "/", label: "Home" },
		{ href: "/create", label: "Create" },
		{ href: "/browse", label: "Browse" },
	];

	const isActive = (href: string) => page.url.pathname === href;

	// mobile toggle
	const toggleMobileNav = () => {
		const nav = document.querySelector(".site-nav");
		nav?.classList.toggle("open");
	};
</script>

<header class="site-header">
	<div class="brand-wrap">
		<a class="brand" href="/">
			<img
				src="/images/codebreaker-logo-white.png"
				alt="Codebreaker Logo"
				height="80"
			/>
			<h1>ctrl alt decode</h1>
		</a>
		<button class="mobile-toggle" aria-label="Toggle navigation" on:click={toggleMobileNav}>
			☰
		</button>
	</div>

	<nav class="site-nav" aria-label="Main navigation">
		{#each navItems as item}
			<a class:active={isActive(item.href)} href={item.href}>
				{item.label}
			</a>
		{/each}

		<button
			type="button"
			class="login-button"
			on:click={() => (showAuthModal = true)}
		>
			Login
		</button>
	</nav>
</header>

<AuthModal bind:open={showAuthModal} />
