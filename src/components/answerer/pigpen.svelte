<script lang="ts">
    import { decodePigpen, normalizePigpenKey, pigpenAlphabet } from "$lib/pigpen";
    import PigpenKey from "../pigpen-key.svelte";
    import PigpenMessage from "../pigpen-message.svelte";

    let {
        cipherText = "",
        key = "",
        onSolved,
    }: {
        cipherText?: string;
        key?: string;
        onSolved?: () => void;
    } = $props();

    let userKey = $state("");
    const alphabet = $derived(pigpenAlphabet(userKey));
    const decodedText = $derived(decodePigpen(cipherText, userKey));
    const expectedPlainText = $derived(decodePigpen(cipherText, key));
    const validKey = $derived(normalizePigpenKey(key).length > 0);
    const isSolved = $derived(
        validKey && normalizePigpenKey(userKey).length > 0 && /[a-z]/i.test(cipherText) &&
            decodedText.toLowerCase() === expectedPlainText.toLowerCase(),
    );

    $effect(() => {
        cipherText;
        key;
        userKey = "";
    });

    $effect(() => {
        if (isSolved) onSolved?.();
    });
</script>

<section class="tool-panel">
    <h2>Pigpen Solver</h2>
    <div class="cipher-flow">
        <div class="card">
            <span class="step-label">ENCODED MESSAGE</span>
            {#if cipherText}
                <PigpenMessage {cipherText} />
            {:else}
                <p>No Pigpen message provided.</p>
            {/if}
        </div>
        <div class="card">
            <label>
                ENTER THE KEYWORD
                <input bind:value={userKey} type="text" placeholder="Guess the keyword..." autocomplete="off" spellcheck="false" />
            </label>
            {#if !validKey}
                <p class="error" role="alert">This cipher has an invalid or missing keyword.</p>
            {:else if isSolved}
                <p class="correct" role="status">✓ Decoded correctly!</p>
            {/if}
        </div>
        <div class="card">
            <span class="step-label">DECODED MESSAGE</span>
            <p class="decoded">{decodedText || "The decoded message will appear here."}</p>
        </div>
        <div class="card">
            <span class="step-label">YOUR PIGPEN SYMBOL KEY</span>
            <PigpenKey {alphabet} />
        </div>
    </div>
</section>

<style>
    .tool-panel {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        padding: 1.5rem;
        box-sizing: border-box;
    }

    h2 {
        margin: 0 0 1.5rem;
        text-align: center;
    }

    .cipher-flow {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .card {
        padding: 1.25rem;
        background: #212425;
        color: #fff;
        border-radius: 15px;
    }

    label, .step-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.07em;
    }

    .step-label {
        margin-bottom: 0.75rem;
    }

    input {
        display: block;
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.85rem 1rem;
        box-sizing: border-box;
        border: 2px solid #93c5fd;
        border-radius: 8px;
        background: #fff;
        color: #111827;
        font: inherit;
        font-size: 1.05rem;
    }

    .decoded {
        margin: 0;
        color: #a7f3d0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .correct, .error {
        margin: 0.75rem 0 0;
        padding: 0.65rem 0.8rem;
        border-radius: 6px;
        font-weight: 700;
    }

    .correct {
        background: #d1fae5;
        color: #065f46;
    }

    .error {
        background: #fee2e2;
        color: #991b1b;
    }

    @media (max-width: 480px) {
        .tool-panel, .card {
            padding: 1rem;
        }
    }
</style>
