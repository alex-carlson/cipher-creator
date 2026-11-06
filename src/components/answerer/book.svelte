<script lang="ts">
    import { decodeBook } from "$lib/book";

    let {
        key = "",
        cipherText = "",
        onSolved,
    }: {
        key?: string;
        cipherText?: string;
        onSolved?: () => void;
    } = $props();

    let userAnswer = $state("");
    const result = $derived(decodeBook(key, cipherText));
    const normalize = (value: string) => value.trim().replace(/\s+/gu, " ").toLowerCase();
    const isSolved = $derived(
        result.ok && normalize(userAnswer).length > 0 &&
            normalize(userAnswer) === normalize(result.value),
    );

    $effect(() => {
        key;
        cipherText;
        userAnswer = "";
    });

    $effect(() => {
        if (isSolved) onSolved?.();
    });
</script>

<section class="tool-panel">
    <h2>Book Cipher Solver</h2>
    <div class="cipher-flow">
        <div class="card">
            <span class="step-label">SOURCE PASSAGE</span>
            <p>Blank lines separate stanzas. Count stanza, line, word, and character from 1. Punctuation counts as part of a word; blank lines in the code separate words.</p>
            <pre>{key || "No source passage provided."}</pre>
        </div>
        <div class="card">
            <span class="step-label">ENCODED COORDINATES</span>
            <pre>{cipherText || "No coordinates provided."}</pre>
        </div>
        <div class="card">
            <label>
                ENTER YOUR DECODED MESSAGE
                <textarea bind:value={userAnswer} rows="3" placeholder="What does the book cipher say?" autocomplete="off" spellcheck="false"></textarea>
            </label>
            {#if !result.ok}
                <p class="error" role="alert">{result.error}</p>
            {:else if isSolved}
                <p class="correct" role="status">✓ Correct answer!</p>
            {/if}
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
    h2 { margin: 0 0 1.5rem; text-align: center; }
    .cipher-flow { display: flex; flex-direction: column; gap: 0.75rem; }
    .card { padding: 1.25rem; background: #212425; color: #fff; border-radius: 15px; min-width: 0; }
    .step-label, label { display: block; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.07em; }
    .step-label { margin-bottom: 0.75rem; }
    pre { overflow-x: auto; white-space: pre; margin: 0; font-size: 0.9rem; }
    textarea {
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
        resize: vertical;
    }
    .correct, .error { margin: 0.75rem 0 0; padding: 0.65rem 0.8rem; border-radius: 6px; font-weight: 700; }
    .correct { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #991b1b; }
    @media (max-width: 480px) { .tool-panel, .card { padding: 1rem; } }
</style>
