<script lang="ts">
    import { addDoc, collection, serverTimestamp } from "firebase/firestore";
    import Substitution from "../../components/creator/substitution.svelte";
    import CustomGlyph from "../../components/creator/custom-glyph.svelte";
    import Morse from "../../components/creator/morse.svelte";
    import Polybius from "../../components/creator/polybius.svelte";
    import { db, firebaseReady } from "$lib/firebase";

    type ToolType = "custom-glyph" | "substitution" | "morse" | "polybius";
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

    type PolybiusToolCode = {
        id: string;
        type: "polybius";
        data: SubstitutionConfig;
    };

    type CustomGlyphToolCode = {
        id: string;
        type: "custom-glyph";
        data: CustomGlyphConfig;
    };

    type MorseConfig = {
        message: string;
        cipherText: string;
    };

    type MorseToolCode = {
        id: string;
        type: "morse";
        data: MorseConfig;
    };

    type ToolCode = SubstitutionToolCode | CustomGlyphToolCode | PolybiusToolCode | MorseToolCode;

    const makeSubstitutionConfig = (): SubstitutionConfig => ({
        alphabet: "abcdefghijklmnopqrstuvwxyz",
        key: "key",
        message: "",
        cipherText: "",
    });

    const makePolybiusConfig = (): SubstitutionConfig => ({
        alphabet: "abcdefghiklmnopqrstuvwxyz",
        key: "keyword",
        message: "",
        cipherText: "",
    });

    const makeCustomGlyphConfig = (): CustomGlyphConfig => ({
        message: "",
        glyphs: [],
    });

    const makeMorseConfig = (): MorseConfig => ({
        message: "",
        cipherText: "",
    });

    let selectedTool = $state<ToolType | "">("");
    let codes = $state<ToolCode[]>([]);
    let cipherName = $state("");
    let saveState = $state<"idle" | "saving" | "saved" | "error">("idle");
    let saveMessage = $state("");

    const appendSelectedTool = () => {
        if (!selectedTool) return;

        let initialData;
        if (selectedTool === "substitution") {
            initialData = makeSubstitutionConfig();
        } else if (selectedTool === "polybius") {
            initialData = makePolybiusConfig();
        } else if (selectedTool === "morse") {
            initialData = makeMorseConfig();
        } else {
            initialData = makeCustomGlyphConfig();
        }

        codes = [
            ...codes,
            {
                id: `${selectedTool}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: selectedTool,
                data: initialData,
            } as ToolCode,
        ];

        selectedTool = "";
    };

    const updateCode = (
        id: string,
        value: SubstitutionConfig | CustomGlyphConfig | MorseConfig,
    ) => {
        codes = codes.map((code) =>
            code.id === id ? ({ ...code, data: value } as ToolCode) : code,
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
        event: any,
        id: string,
    ) => {
        updateCode(id, event.detail);
    };

    const handleCustomGlyphChange = (
        event: any,
        id: string,
    ) => {
        updateCode(id, {
            message: event.detail.message,
            glyphs: event.detail.glyphs.map((glyph: any) => ({ ...glyph })),
        });
    };

    const handleMorseChange = (event: any, id: string) => {
        updateCode(id, event.detail);
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
                        {#if code.type === "custom-glyph"}
                            Custom Glyph
                        {:else if code.type === "substitution"}
                            Substitution
                        {:else if code.type === "morse"}
                            Morse Code
                        {:else if code.type === "polybius"}
                            Polybius Square
                        {/if}
                    </strong>
                    <span>Cipher {index + 1} of {codes.length}</span>
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
            {:else if code.type === "morse"}
                <Morse
                    on:cipherChange={(event) =>
                        handleMorseChange(event, code.id)}
                />
            {:else if code.type === "polybius"}
                <Polybius
                    codeId={code.id}
                    onCipherChange={(event) =>
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
            <option value="">-- Choose a tool --</option>
            <option value="substitution">Substitution</option>
            <option value="custom-glyph">Custom Glyph</option>
            <option value="morse">Morse Code</option>
            <option value="polybius">Polybius Square</option>
        </select>
    </section>

    <div class="save-bar">
<button type="button" onclick={saveCipher} disabled={saveState === "saving"}>
Save Cipher Sequence

{#if saveMessage}
{saveMessage}
{/if}
</button>
</div>
</main>