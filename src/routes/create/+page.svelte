<script lang="ts">
    import { addDoc, collection, serverTimestamp } from "firebase/firestore";
    import Substitution from "../../components/creator/substitution.svelte";
    import CustomGlyph from "../../components/creator/custom-glyph.svelte";
    import { db, firebaseReady } from "$lib/firebase";

    type ToolType = "custom-glyph" | "substitution";
    type SubstitutionConfig = {
        alphabet: string;
        key: string;
        message: string;
        cipherText: string;
    };
    type CustomGlyphConfig = {
        message: string;
        glyphs: Array<{ id: number; char: string; dataUrl: string }>;
    };

    type SubstitutionToolCode = {
        id: string;
        type: "substitution";
        data: SubstitutionConfig;
    };

    type CustomGlyphToolCode = {
        id: string;
        type: "custom-glyph";
        data: CustomGlyphConfig;
    };

    type ToolCode = SubstitutionToolCode | CustomGlyphToolCode;

    const makeSubstitutionConfig = (): SubstitutionConfig => ({
        alphabet: "abcdefghijklmnopqrstuvwxyz",
        key: "key",
        message: "",
        cipherText: "",
    });

    const makeCustomGlyphConfig = (): CustomGlyphConfig => ({
        message: "",
        glyphs: [],
    });

    let selectedTool = $state<ToolType | "">("");
    let codes = $state<ToolCode[]>([]);
    let cipherName = $state("");
    let saveState = $state<"idle" | "saving" | "saved" | "error">("idle");
    let saveMessage = $state("");

    const appendSelectedTool = () => {
        if (!selectedTool) return;

        codes = [
            ...codes,
            {
                id: `${selectedTool}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: selectedTool,
                data:
                    selectedTool === "substitution"
                        ? makeSubstitutionConfig()
                        : makeCustomGlyphConfig(),
            },
        ];

        selectedTool = "";
    };

    const updateCode = (
        id: string,
        value: SubstitutionConfig | CustomGlyphConfig,
    ) => {
        codes = codes.map((code) =>
            code.id === id ? { ...code, data: value } : code,
        );
    };

    const removeCode = (id: string) => {
        codes = codes.filter((code) => code.id !== id);
    };

    const moveCode = (id: string, direction: -1 | 1) => {
        const index = codes.findIndex((code) => code.id === id);
        const targetIndex = index + direction;

        if (index === -1 || targetIndex < 0 || targetIndex >= codes.length) {
            return;
        }

        const reordered = [...codes];
        [reordered[index], reordered[targetIndex]] = [
            reordered[targetIndex],
            reordered[index],
        ];

        codes = reordered;
    };

    const handleSubstitutionChange = (
        event: CustomEvent<SubstitutionConfig>,
        id: string,
    ) => {
        updateCode(id, event.detail);
    };

    const handleCustomGlyphChange = (
        event: CustomEvent<CustomGlyphConfig>,
        id: string,
    ) => {
        updateCode(id, {
            message: event.detail.message,
            glyphs: event.detail.glyphs.map((glyph) => ({ ...glyph })),
        });
    };

    const saveCipher = async () => {
        const trimmedName = cipherName.trim();

        if (!trimmedName) {
            saveState = "error";
            saveMessage = "Please enter a cipher name before saving.";
            return;
        }

        if (!firebaseReady || !db) {
            saveState = "error";
            saveMessage =
                "Firebase is not configured. Add your VITE_FIREBASE_* values to the environment.";
            return;
        }

        saveState = "saving";
        saveMessage = "Saving...";

        try {
            const payload = {
                name: trimmedName,
                codes: codes.map(({ type, data }) => ({
                    type,
                    ...data,
                })),
                createdAt: serverTimestamp(),
            };

            const writePromise = addDoc(collection(db, "ciphers"), payload);
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "Firebase save timed out. Check your connection and Firestore rules.",
                            ),
                        ),
                    15000,
                );
            });

            await Promise.race([writePromise, timeoutPromise]);
            saveState = "saved";
            saveMessage = "Cipher saved successfully.";
        } catch (error) {
            console.error("Failed to save cipher", error);
            saveState = "error";
            saveMessage =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while saving your cipher.";
        }
    };
</script>

<main class="page">
    <p>Use the tools below to create your own encrypted story.</p>

    <h2>Cipher Name</h2>
    <input
        bind:value={cipherName}
        type="text"
        placeholder="Enter cipher name"
    />

    <p>Click on a cipher type to add it to your toolkit.</p>

    {#each codes as code, index (code.id)}
        <section class="tool-panel">
            <div class="tool-toolbar">
                <div class="tool-heading">
                    <strong>
                        {code.type === "custom-glyph"
                            ? "Custom Glyph"
                            : "Substitution"}
                    </strong>
                    <span>Tool {index + 1} of {codes.length}</span>
                </div>

                <div class="tool-actions">
                    <button
                        type="button"
                        onclick={() => moveCode(code.id, -1)}
                        disabled={index === 0}
                        aria-label="Move tool up"
                        title="Move up"
                    >
                        ↑
                    </button>

                    <button
                        type="button"
                        onclick={() => moveCode(code.id, 1)}
                        disabled={index === codes.length - 1}
                        aria-label="Move tool down"
                        title="Move down"
                    >
                        ↓
                    </button>

                    <button
                        type="button"
                        class="remove-tool"
                        onclick={() => removeCode(code.id)}
                        aria-label="Remove tool"
                        title="Remove tool"
                    >
                        Remove
                    </button>
                </div>
            </div>

            {#if code.type === "custom-glyph"}
                <CustomGlyph
                    bind:message={code.data.message}
                    bind:glyphs={code.data.glyphs}
                    on:cipherChange={(event) =>
                        handleCustomGlyphChange(event, code.id)}
                />
            {:else if code.type === "substitution"}
                <Substitution
                    on:cipherChange={(event) =>
                        handleSubstitutionChange(event, code.id)}
                />
            {/if}
        </section>
    {/each}

    <section class="tool-picker">
        <label for="cipher-tool">Add a cipher type</label>
        <select
            id="cipher-tool"
            bind:value={selectedTool}
            onchange={appendSelectedTool}
        >
            <option value="">Select a cipher</option>
            <option value="custom-glyph">Custom Glyph</option>
            <option value="substitution">Substitution</option>
        </select>
    </section>

    <section>
        <button
            type="button"
            onclick={saveCipher}
            disabled={saveState === "saving"}
        >
            {saveState === "saving" ? "Saving..." : "Save"}
        </button>
        {#if saveMessage}
            <p
                class:success={saveState === "saved"}
                class:error={saveState === "error"}
            >
                {saveMessage}
            </p>
        {/if}
    </section>
</main>

<style>
    .tool-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding-bottom: 0.75rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid #ddd;
    }

    .tool-heading {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .tool-heading span {
        font-size: 0.85rem;
        color: #777;
    }

    .tool-actions {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .tool-actions button {
        min-width: 36px;
        min-height: 36px;
        padding: 0.4rem 0.65rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        color: inherit;
        font-size: 1rem;
        cursor: pointer;
    }

    .tool-actions button:hover:not(:disabled) {
        background: #f1f3f5;
    }

    .tool-actions button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .tool-actions .remove-tool {
        color: #b42318;
        border-color: #e5b7b3;
    }

    .tool-actions .remove-tool:hover {
        background: #fef2f2;
    }
</style>
