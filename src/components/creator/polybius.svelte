<script lang="ts">
    import { untrack } from "svelte";

    type SubstitutionConfig = {
        alphabet: string;
        key: string;
        message: string;
        cipherText: string;
    };

    let { 
        onCipherChange,
        codeId 
    }: { 
        onCipherChange?: (event: { type: string; detail: SubstitutionConfig }, id: string) => void;
        codeId: string;
    } = $props();

    // 5x5 Polybius alphabet (omitting j)
    const alphabet = "abcdefghiklmnopqrstuvwxyz";

    let key = $state("keyword");
    let message = $state("hello world");

    // Normalize key: lower case, replace j with i, remove non-alphabet characters
    const normalizedKey = $derived(
        key.toLowerCase().replace(/j/g, "i").replace(/[^a-z]/g, "")
    );

    const repeatedCharacters = $derived.by(() => {
        const seen = new Set<string>();
        const repeated = new Set<string>();

        for (const char of normalizedKey) {
            if (seen.has(char)) {
                repeated.add(char);
            } else {
                seen.add(char);
            }
        }
        return [...repeated];
    });

    const keyHasDuplicates = $derived(repeatedCharacters.length > 0);

    // Generate the 25-character grid string
    const gridString = $derived.by(() => {
        const uniqueKeyChars = [...new Set(normalizedKey)];
        const remainingChars = [...alphabet].filter((char) => !uniqueKeyChars.includes(char));
        return uniqueKeyChars.join("") + remainingChars.join("");
    });

    // Create a fast lookup for character highlight states
    const uniqueMessageChars = $derived(
        new Set([...message.toLowerCase()].map(c => c === 'j' ? 'i' : c))
    );

    // Encrypt using the 5x5 Polybius Square coords
    const cipherText = $derived.by(() => {
        if (keyHasDuplicates) return "";

        const lookup = new Map<string, string>();
        for (let i = 0; i < gridString.length; i++) {
            const row = Math.floor(i / 5) + 1;
            const col = (i % 5) + 1;
            lookup.set(gridString[i], `${row}${col}`);
        }

        return [...message]
            .map((char) => {
                const lowerChar = char.toLowerCase();
                const targetChar = lowerChar === "j" ? "i" : lowerChar;
                return lookup.get(targetChar) ?? char;
            })
            .join("");
    });

    let lastDispatched = "";

    $effect(() => {
        const config: SubstitutionConfig = {
            alphabet,
            key,
            message,
            cipherText,
        };

        const serialized = JSON.stringify(config);
        if (serialized === lastDispatched) return;
        lastDispatched = serialized;

        untrack(() => {
            if (onCipherChange) {
                onCipherChange({ type: "cipherChange", detail: config }, codeId);
            }
        });
    });
</script>

<div class="polybius-container">
    <!-- Control Panel Inputs -->
    <div class="control-panel">
        <div class="input-group">
            <label for="key">Cipher Key</label>
            <input
                bind:value={key}
                type="text"
                id="key"
                placeholder="Enter unique key..."
                class:input-error={keyHasDuplicates}
            />
            {#if keyHasDuplicates}
                <p class="error-msg" role="alert">
                    Key contains duplicates: <strong>{repeatedCharacters.join(', ')}</strong>
                </p>
            {/if}
        </div>

        <div class="input-group">
            <label for="message">Plaintext Message</label>
            <textarea bind:value={message} id="message" placeholder="Type message..."></textarea>
        </div>

        <div class="input-group output-group">
            <label for="output">Ciphertext Coordinates</label>
            <div id="output" class="cipher-output">{cipherText || 'Fix errors above...'}</div>
        </div>
    </div>

    <!-- 5x5 Polybius Square Visualization -->
    <div class="grid-panel">
        <h3>Polybius Grid View</h3>
        <div class="polybius-grid-wrapper">
            <!-- Corner Blank Header Column -->
            <div class="grid-label index-corner"></div>
            <!-- Row Headers (Top Columns 1-5) -->
            {#each [1, 2, 3, 4, 5] as colNum}
                <div class="grid-label col-header">{colNum}</div>
            {/each}

            <!-- Grid rows generation -->
            {#each [0, 1, 2, 3, 4] as rowIndex}
                <!-- Column Header (Left Rows 1-5) -->
                <div class="grid-label row-header">{rowIndex + 1}</div>
				
                <!-- Grid Elements -->
                {#each [0, 1, 2, 3, 4] as colIndex}
                    {@const charIndex = rowIndex * 5 + colIndex}
                    {@const currentChar = gridString[charIndex]}
                    {@const isKeyChar = normalizedKey.includes(currentChar)}
                    {@const isActive = uniqueMessageChars.has(currentChar)}
					
                    <div 
                        class="grid-cell" 
                        class:key-member={isKeyChar}
                        class:cell-active={isActive}
                    >
                        <span class="letter">
                            {currentChar === 'i' ? 'I/J' : currentChar?.toUpperCase()}
                        </span>
                        <span class="coord-tag">{rowIndex + 1}{colIndex + 1}</span>
                    </div>
                {/each}
            {/each}
        </div>
        <div class="legend">
            <span class="legend-item"><span class="swatch key-swatch"></span> Key Character</span>
            <span class="legend-item"><span class="swatch active-swatch"></span> Active in Text</span>
        </div>
    </div>
</div>

<style>
    .polybius-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        max-width: 850px;
        margin: 0 auto;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 1.5rem;
        background: #fdfdfd;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }

    @media (min-width: 650px) {
        .polybius-container {
            grid-template-columns: 1fr 1fr;
        }
    }

    .control-panel {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .input-group label {
        font-weight: 600;
        font-size: 0.9rem;
        color: #4a5568;
    }

    .input-group input, .input-group textarea {
        padding: 0.6rem 0.8rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 1rem;
        outline: none;
        transition: border 0.2s;
    }

    .input-group input:focus, .input-group textarea:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }

    .input-group textarea {
        min-height: 80px;
        resize: vertical;
    }

    .input-error {
        border-color: #ef4444 !important;
        background: #fef2f2;
    }

    .error-msg {
        margin: 0;
        font-size: 0.8rem;
        color: #ef4444;
    }

    .cipher-output {
        padding: 0.8rem;
        background: #1e293b;
        color: #38bdf8;
        font-family: monospace;
        font-size: 1.1rem;
        border-radius: 6px;
        letter-spacing: 0.05em;
        word-break: break-all;
        min-height: 40px;
    }

    .grid-panel h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        color: #1e293b;
    }

    .polybius-grid-wrapper {
        display: grid;
        grid-template-columns: 2rem repeat(5, 1fr);
        gap: 4px;
        background: #f1f5f9;
        padding: 8px;
        border-radius: 8px;
        aspect-ratio: 1;
    }

    .grid-label {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #64748b;
        font-size: 0.85rem;
    }

    .grid-cell {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
        font-weight: 700;
        color: #334155;
        transition: all 0.2s ease;
    }

    .key-member {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #1d4ed8;
    }

    .cell-active {
        background: #f0fdf4 !important;
        border-color: #bbf7d0 !important;
        color: #166534 !important;
        transform: scale(1.02);
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }

    .grid-cell .letter {
        font-size: 1.1rem;
    }

    .coord-tag {
        position: absolute;
        bottom: 2px;
        right: 3px;
        font-size: 0.6rem;
        color: #94a3b8;
        font-weight: 400;
    }

    .legend {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        font-size: 0.8rem;
        color: #64748b;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }

    .swatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
    }

    .key-swatch { background: #eff6ff; border: 1px solid #bfdbfe; }
    .active-swatch { background: #f0fdf4; border: 1px solid #bbf7d0; }
</style>
