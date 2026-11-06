<script lang="ts">
    import { addDoc, collection, serverTimestamp } from "firebase/firestore";
    import Substitution from "../../components/creator/substitution.svelte";
    import CustomGlyph from "../../components/creator/custom-glyph.svelte";
    import Morse from "../../components/creator/morse.svelte";
    import Polybius from "../../components/creator/polybius.svelte";
    import Binary from "../../components/creator/binary.svelte";
    import Caesar from "../../components/creator/caesar.svelte";
    import Pigpen from "../../components/creator/pigpen.svelte";
    import Book from "../../components/creator/book.svelte";
    import { decodeBook } from "$lib/book";
    import { normalizePigpenKey } from "$lib/pigpen";
    import { db, firebaseReady } from "$lib/firebase";

    type ToolType = "custom-glyph" | "substitution" | "morse" | "polybius" | "binary" | "caesar" | "pigpen" | "book";
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

    type BinaryConfig = {
        message: string;
        cipherText: string;
    };

    type CaesarConfig = {
        message: string;
        cipherText: string;
        shift: number;
    };

    type PigpenConfig = {
        key: string;
        message: string;
        cipherText: string;
    };

    type MorseToolCode = {
        id: string;
        type: "morse";
        data: MorseConfig;
    };

    type BinaryToolCode = {
        id: string;
        type: "binary";
        data: BinaryConfig;
    };

    type CaesarToolCode = {
        id: string;
        type: "caesar";
        data: CaesarConfig;
    };

    type PigpenToolCode = {
        id: string;
        type: "pigpen";
        data: PigpenConfig;
    };

    type BookToolCode = {
        id: string;
        type: "book";
        data: PigpenConfig;
    };

    type ToolCode = SubstitutionToolCode | CustomGlyphToolCode | PolybiusToolCode | MorseToolCode | BinaryToolCode | CaesarToolCode | PigpenToolCode | BookToolCode;

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

    const makeBinaryConfig = (): BinaryConfig => ({
        message: "",
        cipherText: "",
    });

    const makeCaesarConfig = (): CaesarConfig => ({
        message: "",
        cipherText: "",
        shift: 3,
    });

    const makePigpenConfig = (): PigpenConfig => ({
        key: "keyword",
        message: "",
        cipherText: "",
    });

    const makeBookConfig = (): PigpenConfig => ({
        key: "",
        message: "",
        cipherText: "",
    });

    let selectedTool = $state<ToolType | "">("");
    let codes = $state<ToolCode[]>([]);
    let cipherName = $state("");
    let sequential = $state(false);
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
        } else if (selectedTool === "binary") {
            initialData = makeBinaryConfig();
        } else if (selectedTool === "caesar") {
            initialData = makeCaesarConfig();
        } else if (selectedTool === "pigpen") {
            initialData = makePigpenConfig();
        } else if (selectedTool === "book") {
            initialData = makeBookConfig();
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
        value: SubstitutionConfig | CustomGlyphConfig | MorseConfig | CaesarConfig | PigpenConfig,
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

    const handleBinaryChange = (event: any, id: string) => {
        updateCode(id, event.detail);
    };

    const saveCipher = async () => {
        const trimmedName = cipherName.trim();

        if (!trimmedName) {
            saveState = "error";
            saveMessage = "Please enter a cipher name before saving.";
            return;
        }

        if (codes.some((code) => code.type === "pigpen" && !normalizePigpenKey(code.data.key))) {
            saveState = "error";
            saveMessage = "Each Pigpen cipher needs a keyword containing at least one letter.";
            return;
        }

        if (codes.some((code) => code.type === "pigpen" && !/[a-z]/i.test(code.data.message))) {
            saveState = "error";
            saveMessage = "Each Pigpen message needs at least one letter.";
            return;
        }

        for (const code of codes) {
            if (code.type === "book") {
                const result = decodeBook(code.data.key, code.data.cipherText);
                if (!result.ok) {
                    saveState = "error";
                    saveMessage = `Book cipher: ${result.error}`;
                    return;
                }
            }
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
                sequential,
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

    <label class="sequential-option">
        <input type="checkbox" bind:checked={sequential} />
        <span>
            Sequential
            <small>Show each code only after the previous one is solved.</small>
        </span>
    </label>

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
                        {:else if code.type === "binary"}
                            Binary
                        {:else if code.type === "caesar"}
                            Caesar
                        {:else if code.type === "pigpen"}
                            Pigpen
                        {:else if code.type === "book"}
                            Book Cipher
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
            {:else if code.type === "binary"}
                <Binary
                    on:cipherChange={(event) =>
                        handleBinaryChange(event, code.id)}
                />
            {:else if code.type === "caesar"}
                <Caesar
                    on:cipherChange={(event) => updateCode(code.id, event.detail)}
                />
            {:else if code.type === "pigpen"}
                <Pigpen
                    on:cipherChange={(event) => updateCode(code.id, event.detail)}
                />
            {:else if code.type === "book"}
                <Book
                    on:cipherChange={(event) => updateCode(code.id, event.detail)}
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
            <option value="binary">Binary</option>
            <option value="caesar">Caesar</option>
            <option value="pigpen">Pigpen</option>
            <option value="book">Book Cipher</option>
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

<style>
    .sequential-option {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        margin: 1rem 0;
        cursor: pointer;
    }

    .sequential-option input {
        margin-top: 0.25rem;
    }

    .sequential-option small {
        display: block;
        margin-top: 0.2rem;
        color: #777;
    }
</style>