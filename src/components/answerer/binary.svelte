<script lang="ts">
    type BinaryProps = {
        cipherText?: string;
        onSolved?: () => void;
    };

    let { cipherText: initialCipherText = "", onSolved }: BinaryProps = $props();

    let cipherText = $state("");
    let userAnswer = $state("");

    $effect(() => {
        cipherText = initialCipherText;
        userAnswer = "";
    });

    const decodeBinary = (text: string) => {
        const bits = text.replace(/\s+/g, "");

        if (!/^[01]*$/.test(bits) || bits.length % 8 !== 0) return "";

        const bytes = new Uint8Array(bits.match(/.{8}/g)?.map((byte) => parseInt(byte, 2)) ?? []);
        return new TextDecoder().decode(bytes);
    };

    const expectedPlainText = $derived(decodeBinary(cipherText));
    const isCorrect = $derived(
        expectedPlainText.length > 0 &&
            userAnswer.trim().toLowerCase() === expectedPlainText.trim().toLowerCase(),
    );
    const isSolved = $derived(userAnswer.trim().length > 0 && isCorrect);

    $effect(() => {
        if (isSolved) onSolved?.();
    });
</script>

<section class="tool-panel">
    <h2>Binary Solver</h2>

    <div class="cipher-flow">
        <div class="message-card encoded-card">
            <span class="step-label">ENCODED MESSAGE (UTF-8 BINARY)</span>
            <p class="cipher-text">{cipherText || "No binary message provided."}</p>
        </div>

        <div class="flow-arrow" aria-hidden="true">↓</div>

        <div class="key-card">
            <label for="binary-answer">ENTER YOUR DECODED MESSAGE</label>
            <textarea
                id="binary-answer"
                bind:value={userAnswer}
                rows="3"
                placeholder="What does the binary say?"
                autocomplete="off"
                spellcheck="false"
            ></textarea>

            {#if userAnswer.trim().length > 0 && isCorrect}
                <p class="feedback correct">✓ Correct answer!</p>
            {/if}
        </div>

        <div class="flow-arrow" aria-hidden="true">↓</div>

        <div class="message-card decoded-card">
            <span class="step-label">DECODED MESSAGE</span>
            <p class="decoded-text">
                {userAnswer || "Your decoded message will appear here."}
            </p>
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

    .tool-panel h2 {
        margin: 0 0 1.5rem;
        font-size: 1.6rem;
        text-align: center;
    }

    .cipher-flow {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .message-card,
    .key-card {
        padding: 1.25rem;
        box-sizing: border-box;
        background-color: #212425;
        color: #ffffff;
        border-radius: 15px;
    }

    .step-label,
    .key-card label {
        display: block;
        margin-bottom: 0.75rem;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.07em;
    }

    .cipher-text,
    .decoded-text {
        margin: 0;
        font-size: 1.15rem;
        line-height: 1.8;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }

    .cipher-text {
        font-family: monospace;
        font-weight: 600;
        letter-spacing: 0.04em;
    }

    .decoded-text {
        font-weight: 600;
        color: #a7f3d0;
    }

    .key-card textarea {
        display: block;
        width: 100%;
        padding: 0.85rem 1rem;
        border: 2px solid #93c5fd;
        border-radius: 8px;
        background: #ffffff;
        color: #111827;
        font: inherit;
        font-size: 1.05rem;
        box-sizing: border-box;
        resize: vertical;
    }

    .key-card textarea:focus {
        outline: 3px solid #bfdbfe;
        border-color: #2563eb;
    }

    .flow-arrow {
        display: flex;
        justify-content: center;
        align-items: center;
        color: #6b7280;
        font-size: 1.75rem;
        font-weight: 800;
        line-height: 1;
    }

    .feedback {
        margin: 0.75rem 0 0;
        padding: 0.65rem 0.8rem;
        border-radius: 6px;
        font-weight: 700;
    }

    .feedback.correct {
        background: #d1fae5;
        color: #065f46;
    }

    @media (max-width: 480px) {
        .tool-panel {
            padding: 1rem;
        }

        .message-card,
        .key-card {
            padding: 1rem;
        }

        .cipher-text,
        .decoded-text {
            font-size: 1rem;
        }
    }
</style>
