<script lang="ts">
    import { onMount } from "svelte";
    import type { CreateTypes } from "canvas-confetti";

    let { trigger = 0 } = $props<{ trigger?: number }>();

    let confetti: CreateTypes | null = null;

    onMount(() => {
        let active = true;

        void import("canvas-confetti").then((module) => {
            if (active) {
                confetti = module.default;
            }
        });

        return () => {
            active = false;
        };
    });

    $effect(() => {
        if (trigger <= 0 || !confetti) return;

        confetti({
            particleCount: 140,
            spread: 100,
            startVelocity: 45,
            origin: { x: 0.5, y: 0.6 },
            colors: ["#dba359", "#ffffff", "#b7c4d4", "#78c6a3"],
            disableForReducedMotion: true,
            zIndex: 2000,
        });

        // A second burst for a little extra celebration.
        const timeout = window.setTimeout(() => {
            confetti?.({
                particleCount: 70,
                angle: 60,
                spread: 65,
                origin: { x: 0, y: 0.7 },
                colors: ["#dba359", "#ffffff", "#b7c4d4"],
                disableForReducedMotion: true,
                zIndex: 2000,
            });

            confetti?.({
                particleCount: 70,
                angle: 120,
                spread: 65,
                origin: { x: 1, y: 0.7 },
                colors: ["#dba359", "#ffffff", "#b7c4d4"],
                disableForReducedMotion: true,
                zIndex: 2000,
            });
        }, 200);

        return () => window.clearTimeout(timeout);
    });
</script>
