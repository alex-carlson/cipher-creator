<script lang="ts">
    import PigpenSymbol from "./pigpen-symbol.svelte";

    let { alphabet }: { alphabet: string } = $props();
</script>

<div class="key-grid" aria-label="Pigpen symbol key">
    {#each [...alphabet] as letter, index}
        <div class="key-cell">
            <PigpenSymbol {index} />
            <span>{letter.toUpperCase()}</span>
        </div>
    {/each}
</div>

<style>
    .key-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(3.2rem, 1fr));
        gap: 0.35rem;
    }

    .key-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        padding: 0.4rem;
        border: 1px solid #6b7280;
        border-radius: 6px;
    }
</style>
