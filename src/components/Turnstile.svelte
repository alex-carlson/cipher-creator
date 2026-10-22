<script lang="ts">
    import { onMount } from "svelte";

    let container: HTMLDivElement;
    let token = $state("");
    let error = $state("");
    let widgetId: string | undefined;

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    declare global {
        interface Window {
            turnstile?: {
                render: (
                    container: HTMLElement,
                    options: {
                        sitekey: string;
                        callback: (token: string) => void;
                        "expired-callback": () => void;
                        "error-callback": () => void;
                        theme?: "light" | "dark" | "auto";
                    },
                ) => string;
                reset: (widgetId?: string) => void;
                remove: (widgetId: string) => void;
            };
        }
    }

    onMount(() => {
        let cancelled = false;
        let script: HTMLScriptElement | undefined;

        function renderWidget() {
            if (cancelled || !container || !window.turnstile) return;

            widgetId = window.turnstile.render(container, {
                sitekey: siteKey,
                theme: "auto",
                callback: (value) => {
                    token = value;
                    error = "";
                },
                "expired-callback": () => {
                    token = "";
                    error = "Verification expired. Please try again.";
                },
                "error-callback": () => {
                    token = "";
                    error = "Verification failed to load. Please retry.";
                },
            });
        }

        if (window.turnstile) {
            renderWidget();
        } else {
            script = document.createElement("script");
            script.src =
                "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;
            script.onload = renderWidget;
            script.onerror = () => {
                error = "Could not load bot verification.";
            };
            document.head.appendChild(script);
        }

        return () => {
            cancelled = true;
            if (widgetId && window.turnstile) {
                window.turnstile.remove(widgetId);
            }
        };
    });

    export function getToken() {
        return token;
    }

    export function reset() {
        token = "";
        if (widgetId && window.turnstile) {
            window.turnstile.reset(widgetId);
        }
    }
</script>

<div class="turnstile-wrapper">
    <div bind:this={container}></div>

    {#if error}
        <p class="error">{error}</p>
    {/if}
</div>

<style>
    .turnstile-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 1rem 0;
    }

    .error {
        color: #e57373;
        font-size: 0.875rem;
    }
</style>
