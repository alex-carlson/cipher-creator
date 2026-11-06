<script lang="ts">
    import { PIGPEN_ALPHABET } from "$lib/pigpen";
    import PigpenSymbol from "./pigpen-symbol.svelte";

    let { cipherText }: { cipherText: string } = $props();
</script>

<div class="message">
    {#each [...cipherText] as char}
        {@const index = PIGPEN_ALPHABET.indexOf(char.toLowerCase())}
        {#if /^[a-z]$/i.test(char)}
            <PigpenSymbol {index} />
        {:else}
            {char}
        {/if}
    {/each}
</div>

<style>
    .message {
        line-height: 1.8;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }
</style>
