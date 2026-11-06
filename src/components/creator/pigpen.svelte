<script lang="ts">
    import { createEventDispatcher, untrack } from "svelte";
    import { encodePigpen, normalizePigpenKey, pigpenAlphabet } from "$lib/pigpen";
    import PigpenKey from "../pigpen-key.svelte";
    import PigpenMessage from "../pigpen-message.svelte";

    type PigpenConfig = {
        key: string;
        message: string;
        cipherText: string;
    };

    const dispatch = createEventDispatcher<{ cipherChange: PigpenConfig }>();
    let key = $state("keyword");
    let message = $state("");
    const validKey = $derived(normalizePigpenKey(key).length > 0);
    const alphabet = $derived(pigpenAlphabet(key));
    const cipherText = $derived(validKey ? encodePigpen(message, key) : "");
    let lastDispatched = "";

    $effect(() => {
        const config: PigpenConfig = { key, message, cipherText };
        const serialized = JSON.stringify(config);
        if (serialized === lastDispatched) return;
        lastDispatched = serialized;
        untrack(() => dispatch("cipherChange", config));
    });
</script>

<div class="cipher">
    <label>
        Cipher keyword
        <input bind:value={key} type="text" aria-invalid={!validKey} placeholder="Enter a keyword..." />
    </label>
    <p>Repeated letters are used once; remaining letters follow in alphabetical order.</p>
    {#if !validKey}
        <p class="error" role="alert">Enter a keyword containing at least one letter.</p>
    {/if}

    <label>
        Plaintext message
        <textarea bind:value={message} rows="3" placeholder="Enter a message..."></textarea>
    </label>

    <span>Encoded message</span>
    <div class="encoded"><PigpenMessage {cipherText} /></div>

    <h3>Pigpen symbol key</h3>
    <PigpenKey {alphabet} />
</div>

<style>
    .cipher, label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    p, h3 {
        margin: 0;
    }

    textarea, input {
        padding: 0.6rem;
        font: inherit;
    }

    .encoded {
        min-height: 2rem;
    }

    .error {
        color: #fca5a5;
    }
</style>
