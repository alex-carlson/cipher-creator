<script lang="ts">
    import { createEventDispatcher, untrack } from "svelte";
    import { decodeBook, encodeBook } from "$lib/book";

    type BookConfig = {
        key: string;
        message: string;
        cipherText: string;
    };

    const dispatch = createEventDispatcher<{ cipherChange: BookConfig }>();
    let key = $state("");
    let message = $state("");
    let manualCode = $state("");
    let mode = $state<"message" | "coordinates">("message");

    const result = $derived(
        mode === "message" ? encodeBook(key, message) : decodeBook(key, manualCode),
    );
    const cipherText = $derived(mode === "message" ? (result.ok ? result.value : "") : manualCode);
    const plainText = $derived(mode === "message" ? message : (result.ok ? result.value : ""));
    let lastDispatched = "";

    $effect(() => {
        const config: BookConfig = { key, message: plainText, cipherText };
        const serialized = JSON.stringify(config);
        if (serialized === lastDispatched) return;
        lastDispatched = serialized;
        untrack(() => dispatch("cipherChange", config));
    });
</script>

<div class="book">
    <label>
        Source passage
        <textarea bind:value={key} rows="10" wrap="off" placeholder="Paste the passage with its original line breaks..."></textarea>
    </label>
    <p>Blank lines separate stanzas. Coordinates are stanza, line, word, character, all starting at 1. Words are separated by whitespace; punctuation counts as part of a word.</p>
    <label>
        Create from
        <select bind:value={mode}>
            <option value="message">A message</option>
            <option value="coordinates">Existing coordinates</option>
        </select>
    </label>
    {#if mode === "message"}
        <label>
            Message
            <textarea bind:value={message} rows="3" placeholder="Enter a message..."></textarea>
        </label>
        <span>Encoded coordinates</span>
        <pre>{cipherText}</pre>
    {:else}
        <label>
            Coordinates (one per line; blank lines separate words)
            <textarea bind:value={manualCode} rows="8" wrap="off" placeholder="1,1,1,1"></textarea>
        </label>
        <span>Decoded message</span>
        <pre>{plainText}</pre>
    {/if}
    {#if !result.ok && (key || message || manualCode)}
        <p class="error" role="alert">{result.error}</p>
    {/if}
</div>

<style>
    .book, label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    p { margin: 0; }
    textarea, select {
        box-sizing: border-box;
        width: 100%;
        padding: 0.6rem;
        font: inherit;
    }
    textarea[wrap="off"], pre {
        font-family: monospace;
        white-space: pre;
        overflow-x: auto;
    }
    pre {
        min-height: 1.5rem;
        margin: 0;
    }
    .error { color: #fca5a5; }
</style>
