<script lang="ts">
    import { createEventDispatcher, untrack } from "svelte";
    import { CAESAR_ALPHABET, shiftCaesar } from "$lib/caesar";
    import CaesarShift from "../caesar-shift.svelte";

    type CaesarConfig = {
        message: string;
        cipherText: string;
        shift: number;
    };

    const dispatch = createEventDispatcher<{
        cipherChange: CaesarConfig;
    }>();

    let message = $state("");
    let shift = $state(3);
    const cipherText = $derived(shiftCaesar(message, shift));
    const cipherAlphabet = $derived(shiftCaesar(CAESAR_ALPHABET, shift));
    let lastDispatched = "";

    $effect(() => {
        const config: CaesarConfig = { message, cipherText, shift };
        const serialized = JSON.stringify(config);
        if (serialized === lastDispatched) return;
        lastDispatched = serialized;
        untrack(() => dispatch("cipherChange", config));
    });
</script>

<div class="cipher">
    <p>Rotate letters forward to encrypt. Non-letter characters stay unchanged.</p>
    <CaesarShift bind:shift />

    <div class="alphabet">
        <span>Plain: {CAESAR_ALPHABET}</span>
        <span>Cipher: {cipherAlphabet}</span>
    </div>

    <label>
        Message
        <textarea bind:value={message} rows="3" placeholder="Enter a message..."></textarea>
    </label>

    <span>Encrypted message</span>
    <output>{cipherText}</output>
</div>

<style>
    .cipher, .cipher label, .alphabet {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .cipher p {
        margin: 0;
    }

    .alphabet, output {
        font-family: monospace;
        overflow-wrap: anywhere;
    }

    textarea {
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font: inherit;
        resize: vertical;
    }
</style>
