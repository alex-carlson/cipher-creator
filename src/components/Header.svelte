<script lang="ts">
	import { page } from "$app/state";
	import AuthModal from "./AuthModal.svelte";
	// import home, pencil, question, and browse icons from lucide
	import {
		CircleQuestionMark,
		House,
		SquarePen,
		Search,
		UserRound,
	} from "lucide-svelte";

	let showAuthModal = $state(false);

	const navItems = [
		{ href: "/", label: "Home", icon: House },
		{ href: "/create", label: "Create", icon: SquarePen },
		{ href: "/browse", label: "Browse", icon: Search },
		{ href: "/about", label: "About", icon: CircleQuestionMark },
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
				src="/images/codebreakers.svg"
				alt="Codebreaker Logo"
				height="80"
			/>
		</a>
		<button
			class="mobile-toggle"
			aria-label="Toggle navigation"
			on:click={toggleMobileNav}
		>
			☰
		</button>
	</div>

	<nav class="site-nav" aria-label="Main navigation">
		{#each navItems as item}
			<a class:active={isActive(item.href)} href={item.href}>
				{#if item.icon}
					<span>
						<svelte:component this={item.icon} />
					</span>
				{/if}
				<span>
					{item.label}
				</span>
			</a>
		{/each}

		<!-- <button
			type="button"
			class="login-button"
			on:click={() => (showAuthModal = true)}
		>
		<span>
			<UserRound />
		</span>
		<span>
			Login
		</span>
		</button> -->
	</nav>
</header>

<AuthModal bind:open={showAuthModal} />
