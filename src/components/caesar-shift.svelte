<script lang="ts">
    import { normalizeCaesarShift } from "$lib/caesar";

    let {
        shift = $bindable(0),
        onChange,
    }: {
        shift?: number;
        onChange?: () => void;
    } = $props();

    const rotate = (amount: number) => {
        shift = normalizeCaesarShift(shift + amount);
        onChange?.();
    };
</script>

<div class="shift-control" role="group" aria-label="Caesar shift">
    <span>Shift: <strong aria-live="polite">{shift}</strong></span>
    <button type="button" aria-label="Decrease shift" onclick={() => rotate(-1)}>↓ −</button>
    <button type="button" aria-label="Increase shift" onclick={() => rotate(1)}>↑ +</button>
</div>

<style>
    .shift-control {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .shift-control button {
        cursor: pointer;
        font: inherit;
        padding: 0.25rem 0.75rem;
    }
</style>
