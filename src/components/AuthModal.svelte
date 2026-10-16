<script lang="ts">
    import { onMount } from "svelte";
    import {
        EmailAuthProvider,
        GoogleAuthProvider,
        onAuthStateChanged,
        signOut,
    } from "firebase/auth";
    import { auth, firebaseReady } from "$lib/firebase";

    let { open = $bindable(false) } = $props<{
        open?: boolean;
    }>();

    let userEmail = $state("");
    let isReady = $state(false);
    let authError = $state("");

    onMount(() => {
        if (!firebaseReady || !auth) {
            isReady = true;
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            userEmail = user?.email ?? "";
            isReady = true;

            // Close the popup once the user signs in.
            if (user) {
                open = false;
            }
        });

        return unsubscribe;
    });

    $effect(() => {
        if (!open || !firebaseReady || !auth || userEmail) {
            return;
        }

        let cancelled = false;
        let ui: any = null;

        void (async () => {
            try {
                const firebaseui = await import("firebaseui");
                await import("firebaseui/dist/firebaseui.css");

                if (cancelled || !auth) return;

                // Reuse an existing FirebaseUI instance if one exists.
                ui =
                    firebaseui.auth.AuthUI.getInstance() ??
                    new firebaseui.auth.AuthUI(auth);

                ui.start("#firebaseui-auth-container", {
                    signInFlow: "popup",
                    signInOptions: [
                        EmailAuthProvider.PROVIDER_ID,
                        GoogleAuthProvider.PROVIDER_ID,
                    ],
                    callbacks: {
                        signInSuccessWithAuthResult: () => false,
                    },
                });
            } catch (error) {
                console.error("Failed to initialize FirebaseUI:", error);
                authError = "Unable to load sign-in. Please try again.";
            }
        })();

        return () => {
            cancelled = true;
            ui?.reset();
        };
    });

    async function logout() {
        if (!auth) return;

        await signOut(auth);
        userEmail = "";
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            open = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />
{#if open}
    <div
        class="auth-backdrop"
        role="presentation"
        onclick={(event) => {
            if (event.target === event.currentTarget) {
                open = false;
            }
        }}
    >
        <section
            class="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
        >
            <button
                class="close-button"
                type="button"
                aria-label="Close login"
                onclick={() => (open = false)}
            >
                &times;
            </button>

            {#if !isReady}
                <p>Loading authentication...</p>
            {:else if userEmail}
                <h2 id="auth-title">Welcome back</h2>
                <p>Signed in as {userEmail}</p>
                <button type="button" onclick={logout}>Sign out</button>
            {:else}
                <h2 id="auth-title">Login / Register</h2>
                <p>Sign in to continue working on your project.</p>

                {#if authError}
                    <p class="auth-error" role="alert">{authError}</p>
                {/if}

                <div id="firebaseui-auth-container"></div>
            {/if}
        </section>
    </div>
{/if}

<style>
    .auth-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgb(0 0 0 / 60%);
        overflow-y: auto;
    }

    .auth-modal {
        position: relative;
        width: 100%;
        max-width: 440px;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        padding: 2rem;
        border-radius: 12px;
        background: var(--auth-modal-bg, white);
        color: var(--auth-modal-color, #222);
        box-shadow: 0 12px 48px rgb(0 0 0 / 25%);
    }

    .auth-modal h2 {
        margin-top: 0;
        padding-right: 1.5rem;
    }

    .close-button {
        position: absolute;
        top: 0.75rem;
        right: 0.9rem;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 2rem;
        line-height: 1;
        cursor: pointer;
    }

    .auth-error {
        color: #c62828;
    }

    :global(#firebaseui-auth-container) {
        margin-top: 1.5rem;
    }
</style>
