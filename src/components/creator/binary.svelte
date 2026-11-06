<script lang="ts">
    import { createEventDispatcher } from "svelte";

    type BinaryConfig = {
        message: string;
        cipherText: string;
    };

    const dispatch = createEventDispatcher<{
        cipherChange: BinaryConfig;
    }>();

    let message = $state("");

    const cipherText = $derived(
        [...new TextEncoder().encode(message)]
            .map((byte) => byte.toString(2).padStart(8, "0"))
            .join(" "),
    );

    let lastDispatched = "";

    $effect(() => {
        const config: BinaryConfig = { message, cipherText };
        const serialized = JSON.stringify(config);

        if (serialized === lastDispatched) return;

        lastDispatched = serialized;
        dispatch("cipherChange", config);
    });
</script>

<div class="cipher">
    <label for="binary-message">English message</label>
    <textarea
        bind:value={message}
        id="binary-message"
        name="message"
        placeholder="Enter a message..."
        rows="3"
    ></textarea>

    <label for="binary-output">Binary (UTF-8)</label>
    <output id="binary-output" class="binary-output">
        {cipherText}
    </output>
</div>

<style>
    .cipher {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .cipher textarea {
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font: inherit;
        resize: vertical;
    }

    .binary-output {
        display: block;
        min-height: 1.5rem;
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-family: monospace;
        overflow-wrap: anywhere;
    }
</style>
