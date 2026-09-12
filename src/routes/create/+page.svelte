<script lang="ts">
    import Substitution from '../../components/creator/substitution.svelte';
    import CustomGlyph from '../../components/creator/custom-glyph.svelte';

    type ToolType = 'custom-glyph' | 'substitution';

    let selectedTool = $state<ToolType | ''>('');
    let tools = $state<ToolType[]>([]);

    const appendSelectedTool = () => {
        if (!selectedTool) return;

        tools = [...tools, selectedTool];
        selectedTool = '';
    };
</script>

<main class="page">
    <h1>Cipher Creator</h1>
    <p>Use the tools below to create your own encrypted story.</p>

    <section class="tool-panel">
        {#each tools as tool (tool)}
            {#if tool === 'custom-glyph'}
                <CustomGlyph />
            {:else if tool === 'substitution'}
                <Substitution />
            {/if}
        {/each}
    </section>

    <div class="tool-picker">
        <label for="cipher-tool">Add a cipher type</label>
        <select id="cipher-tool" bind:value={selectedTool} on:change={appendSelectedTool}>
            <option value="">Select a cipher</option>
            <option value="custom-glyph">Custom Glyph</option>
            <option value="substitution">Substitution</option>
        </select>
    </div>
</main>
