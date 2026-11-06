<script lang="ts">
    import { PIGPEN_WEDGES } from "$lib/pigpen";

    let { index }: { index: number } = $props();

    const grid = $derived(index < 18);
    const position = $derived(grid ? index % 9 : (index - 18) % 4);
    const dotted = $derived((index >= 9 && index < 18) || index >= 22);
    const row = $derived(Math.floor(position / 3));
    const column = $derived(position % 3);
    const wedge = $derived(PIGPEN_WEDGES[position]);
</script>

<svg viewBox="0 0 32 32" role="img" aria-label={`Pigpen symbol ${index + 1}`}>
    {#if grid}
        {#if row > 0}<path d="M 3 3 H 29" />{/if}
        {#if row < 2}<path d="M 3 29 H 29" />{/if}
        {#if column > 0}<path d="M 3 3 V 29" />{/if}
        {#if column < 2}<path d="M 29 3 V 29" />{/if}
    {:else}
        <path d={wedge.path} />
    {/if}
    {#if dotted}
        <circle cx={grid ? 16 : wedge.dotX}
            cy={grid ? 16 : wedge.dotY} r="2" />
    {/if}
</svg>

<style>
    svg {
        display: inline-block;
        width: 1.4em;
        height: 1.4em;
        vertical-align: middle;
        flex: none;
    }

    path {
        fill: none;
        stroke: currentColor;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    circle {
        fill: currentColor;
    }
</style>
