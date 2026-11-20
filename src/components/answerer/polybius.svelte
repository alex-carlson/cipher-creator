<script lang="ts">
    type PolybiusProps = {
        key?: string;
        cipherText?: string;
        onSolved?: () => void;
    };

    let {
        key = "",
        cipherText: initialCipherText = "",
        onSolved,
    }: PolybiusProps = $props();

    // 5x5 Polybius base alphabet (omitting j, which maps to i)
    const alphabet = "abcdefghiklmnopqrstuvwxyz";

    let userKey = $state("");
    let cipherText = $state(initialCipherText);

    $effect(() => {
        cipherText = initialCipherText;
    });

    // Normalize key input variants
    const normalizeKey = (val: string) => {
        return val.toLowerCase().replace(/j/g, "i").replace(/[^a-z]/g, "");
    };

    // Generate the 25-character grid string for any given key sequence
    const buildGridString = (keyValue: string) => {
        const cleanKey = normalizeKey(keyValue);
        const uniqueKeyChars: string[] = [];

        for (const char of cleanKey) {
            if (!uniqueKeyChars.includes(char)) {
                uniqueKeyChars.push(char);
            }
        }

        const remaining = [...alphabet].filter(
            (char) => !uniqueKeyChars.includes(char),
        );

        return [...uniqueKeyChars, ...remaining].join("");
    };

    // Decode coordinate pairs back into plaintext using a grid layout
    const decodeWithKey = (text: string, keyValue: string) => {
        const gridString = buildGridString(keyValue);
		
        // Map "RowColumn" index string back to character value
        const lookup = new Map<string, string>();
        for (let i = 0; i < gridString.length; i++) {
            const row = Math.floor(i / 5) + 1;
            const col = (i % 5) + 1;
            lookup.set(`${row}${col}`, gridString[i]);
        }

        let result = "";
        let i = 0;

        while (i < text.length) {
            // Pull characters out sequentially to check for digit pairings
            const char1 = text[i];
            const char2 = text[i + 1];

            if (/[1-5]/.test(char1) && char2 && /[1-5]/.test(char2)) {
                const coordPair = char1 + char2;
                result += lookup.get(coordPair) ?? coordPair;
                i += 2; // Jump by two for valid cipher pairs
            } else {
                result += char1;
                i += 1; // Preserve spacings/non-numeric characters
            }
        }

        return result;
    };

    // Dynamic reactive parameters for validation checks
    const currentGridString = $derived(buildGridString(userKey));
    // Coordinates regrouped as pairs, dropping the original word/sentence spacing
    const coordinatePairs = $derived(
        cipherText.replace(/[^1-5]/g, "").match(/[1-5]{2}/g)?.join(" ") ?? "",
    );
    const decodeText = $derived(decodeWithKey(cipherText, userKey));
    const expectedPlainText = $derived(decodeWithKey(cipherText, key));

    const isCorrect = $derived(
        normalizeKey(userKey) === normalizeKey(key)
    );

    const isDecodedCorrectly = $derived(
        decodeText.trim().toLowerCase() === expectedPlainText.trim().toLowerCase()
    );
    // Result of the last Confirm press; cleared when the keyword changes
    let verdict = $state<"exact" | "decoded" | "wrong" | null>(null);

    const clearVerdict = () => {
        verdict = null;
    };

    const confirmKey = () => {
        if (userKey.trim().length === 0) return;

        verdict = isCorrect ? "exact" : isDecodedCorrectly ? "decoded" : "wrong";
        if (verdict !== "wrong") onSolved?.();
    };
</script>

<section class="tool-panel">
    <h2>Polybius Square Solver</h2>

    <div class="cipher-flow">
        <div class="message-card encoded-card">
            <span class="step-label">ENCODED MESSAGE (COORDINATES)</span>
            <p class="cipher-text">{coordinatePairs}</p>
        </div>

        <div class="key-card">
            <label for="polybius-key">ENTER THE GRID KEYWORD</label>
            <input
                id="polybius-key"
                bind:value={userKey}
                oninput={clearVerdict}
                type="text"
                placeholder="Guess the secret keyword..."
                autocomplete="off"
                spellcheck="false"
            />
        </div>

        <!-- Interactive Structural 5x5 Matrix Block Blueprint -->
        <div class="grid-panel">
            <span class="step-label">ACTIVE 5x5 DECRYPTION BLUEPRINT</span>
            <div class="polybius-grid-wrapper">
                <div class="grid-label index-corner"></div>
                {#each [1, 2, 3, 4, 5] as colNum}
                    <div class="grid-label col-header">{colNum}</div>
                {/each}

                {#each Array(5) as _, rowIndex}
                    <div class="grid-label row-header">{rowIndex + 1}</div>
                    {#each Array(5) as _, colIndex}
                        {@const charIndex = rowIndex * 5 + colIndex}
                        {@const currentChar = currentGridString[charIndex]}
                        {@const isKeyChar = normalizeKey(userKey).includes(currentChar)}

                        <div class="grid-cell" class:key-member={isKeyChar && userKey.length > 0}>
                            <span class="letter">
                                {currentChar === 'i' ? 'I/J' : currentChar?.toUpperCase()}
                            </span>
                            <span class="coord-tag">{rowIndex + 1}{colIndex + 1}</span>
                        </div>
                    {/each}
                {/each}
            </div>
        </div>

        <div class="confirm-row">
            <button
                type="button"
                class="confirm-button"
                onclick={confirmKey}
                disabled={userKey.trim().length === 0}
            >
                Confirm keyword
            </button>

            {#if verdict === "exact"}
                <p class="feedback correct">✓ Perfect match! Excellent cryptographic analysis!</p>
            {:else if verdict === "decoded"}
                <p class="feedback correct">✓ Decoded correctly! (Keys share matching visual layouts).</p>
            {:else if verdict === "wrong"}
                <p class="feedback incorrect">✗ That keyword doesn't decode the message. Keep trying!</p>
            {/if}
        </div>

        <div class="message-card decoded-card">
            <span class="step-label">DECODED MESSAGE OUTPUT</span>
            <p class="decoded-text" class:success-text={verdict === "exact" || verdict === "decoded"}>
                {decodeText || "The plaintext message transforms here..."}
            </p>
        </div>
    </div>
</section>

<style>
    .tool-panel {
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        padding: 1.5rem;
        box-sizing: border-box;
        font-family: system-ui, -apple-system, sans-serif;
    }

    .tool-panel h2 {
        margin: 0 0 1.5rem;
        font-size: 1.6rem;
        text-align: center;
        color: #ffffff;
    }

    .cipher-flow {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .message-card,
    .key-card,
    .grid-panel {
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
        color: #94a3b8;
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
        letter-spacing: 0.08em;
        color: #38bdf8;
    }

    .decoded-text {
        font-weight: 600;
        color: #94a3b8;
    }

    .success-text {
        color: #34d399 !important;
    }

    .key-card input {
        display: block;
        width: 100%;
        padding: 0.85rem 1rem;
        border: 2px solid #38bdf8;
        border-radius: 8px;
        background: #ffffff;
        color: #111827;
        font: inherit;
        font-size: 1.05rem;
        box-sizing: border-box;
    }

    .key-card input:focus {
        outline: 3px solid rgba(56, 189, 248, 0.3);
        border-color: #0284c7;
    }

    .feedback {
        margin: 0.75rem 0 0;
        padding: 0.65rem 0.8rem;
        border-radius: 6px;
        font-weight: 700;
    }

    .feedback.correct {
        background: #065f46;
        color: #34d399;
    }

    .feedback.incorrect {
        background: #7f1d1d;
        color: #fca5a5;
    }

    .confirm-row {
        display: flex;
        flex-direction: column;
    }

    .confirm-button {
        width: 100%;
        padding: 0.85rem 1rem;
        border: none;
        border-radius: 8px;
        background: #0284c7;
        color: #ffffff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
    }

    .confirm-button:hover:not(:disabled) {
        background: #0369a1;
    }

    .confirm-button:disabled {
        background: #374151;
        color: #9ca3af;
        cursor: not-allowed;
    }

    .confirm-row .feedback {
        margin-top: 0.75rem;
    }

    /* Matrix Grid Framework Styles */
    .polybius-grid-wrapper {
        display: grid;
        grid-template-columns: 1.5rem repeat(5, 1fr);
        gap: 4px;
        background: #111314;
        padding: 8px;
        border-radius: 8px;
        aspect-ratio: 1;
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        box-sizing: border-box;
    }

    .grid-label {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #64748b;
        font-size: 0.8rem;
    }

    .grid-cell {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #2a2e30;
        border-radius: 4px;
        border: 1px solid #3a3f42;
        font-weight: 700;
        color: #e2e8f0;
    }

    .key-member {
        background: #0c4a6e;
        border-color: #0284c7;
        color: #38bdf8;
    }

    .grid-cell .letter {
        font-size: 1rem;
    }

    .coord-tag {
        position: absolute;
        bottom: 2px;
        right: 3px;
        font-size: 0.55rem;
        color: #64748b;
        font-weight: 400;
    }

    @media (max-width: 480px) {
        .tool-panel {
            padding: 1rem;
        }

        .message-card,
        .key-card,
        .grid-panel {
            padding: 1rem;
        }

        .cipher-text,
        .decoded-text {
            font-size: 1rem;
        }
    }
</style>
