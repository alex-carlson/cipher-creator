<script lang="ts">
    import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
    import Substitution from '../../components/creator/substitution.svelte';
    import CustomGlyph from '../../components/creator/custom-glyph.svelte';
    import { db, firebaseReady } from '$lib/firebase';

    type ToolType = 'custom-glyph' | 'substitution';
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
    type ToolCode = {
        id: string;
        type: ToolType;
        data: SubstitutionConfig | CustomGlyphConfig;
    };

    const makeSubstitutionConfig = (): SubstitutionConfig => ({
        alphabet: 'abcdefghijklmnopqrstuvwxyz',
        key: 'key',
        message: '',
        cipherText: ''
    });

    const makeCustomGlyphConfig = (): CustomGlyphConfig => ({
        message: 'HELLO',
        glyphs: [
            { id: 1, char: 'A', dataUrl: '' },
            { id: 2, char: 'B', dataUrl: '' },
            { id: 3, char: 'C', dataUrl: '' }
        ]
    });

    let selectedTool = $state<ToolType | ''>('');
    let codes = $state<ToolCode[]>([]);
    let cipherName = $state('');
    let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
    let saveMessage = $state('');

    const appendSelectedTool = () => {
        if (!selectedTool) return;

        codes = [
            ...codes,
            {
                id: `${selectedTool}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: selectedTool,
                data: selectedTool === 'substitution' ? makeSubstitutionConfig() : makeCustomGlyphConfig()
            }
        ];

        selectedTool = '';
    };

    const updateCode = (id: string, value: SubstitutionConfig | CustomGlyphConfig) => {
        codes = codes.map((code) => (code.id === id ? { ...code, data: value } : code));
    };

    const handleSubstitutionChange = (event: CustomEvent<SubstitutionConfig>, id: string) => {
        updateCode(id, event.detail);
    };

    const handleCustomGlyphChange = (event: CustomEvent<CustomGlyphConfig>, id: string) => {
        updateCode(id, event.detail);
    };

    const saveCipher = async () => {
        const trimmedName = cipherName.trim();

        if (!trimmedName) {
            saveState = 'error';
            saveMessage = 'Please enter a cipher name before saving.';
            return;
        }

        if (!firebaseReady || !db) {
            saveState = 'error';
            saveMessage = 'Firebase is not configured. Add your VITE_FIREBASE_* values to the environment.';
            return;
        }

        saveState = 'saving';
        saveMessage = 'Saving...';

        try {
            const payload = {
                name: trimmedName,
                codes: codes.map(({ type, data }) => ({
                    type,
                    ...(data as Record<string, unknown>)
                })),
                createdAt: serverTimestamp()
            };

            const writePromise = addDoc(collection(db, 'ciphers'), payload);
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Firebase save timed out. Check your connection and Firestore rules.')), 15000);
            });

            await Promise.race([writePromise, timeoutPromise]);
            saveState = 'saved';
            saveMessage = 'Cipher saved successfully.';
        } catch (error) {
            console.error('Failed to save cipher', error);
            saveState = 'error';
            saveMessage = error instanceof Error ? error.message : 'Something went wrong while saving your cipher.';
        }
    };
</script>

<main class="page">
    <p>Use the tools below to create your own encrypted story.</p>

    <h2>Cipher Name</h2>
    <input bind:value={cipherName} type="text" placeholder="Enter cipher name" />

    <p>Click on a cipher type to add it to your toolkit.</p>

    {#each codes as code (code.id)}
        <section class="tool-panel">
            {#if code.type === 'custom-glyph'}
                <CustomGlyph on:cipherChange={(event) => handleCustomGlyphChange(event, code.id)} />
            {:else if code.type === 'substitution'}
                <Substitution on:cipherChange={(event) => handleSubstitutionChange(event, code.id)} />
            {/if}
        </section>
    {/each}

    <section class="tool-picker">
        <label for="cipher-tool">Add a cipher type</label>
        <select id="cipher-tool" bind:value={selectedTool} on:change={appendSelectedTool}>
            <option value="">Select a cipher</option>
            <option value="custom-glyph">Custom Glyph</option>
            <option value="substitution">Substitution</option>
        </select>
    </section>

    <section>
        <button type="button" on:click={saveCipher} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {#if saveMessage}
            <p class:success={saveState === 'saved'} class:error={saveState === 'error'}>
                {saveMessage}
            </p>
        {/if}
    </section>
</main>
