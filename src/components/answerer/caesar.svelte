<script lang="ts">
    import { CAESAR_ALPHABET, normalizeCaesarShift, shiftCaesar } from "$lib/caesar";
    import CaesarShift from "../caesar-shift.svelte";

    let {
        cipherText = "",
        shift: expectedShift,
        onSolved,
    }: {
        cipherText?: string;
        shift?: number;
        onSolved?: () => void;
    } = $props();

    let shift = $state(0);
    let feedback = $state<"correct" | "incorrect" | "">("");
    const validShift = $derived(
        typeof expectedShift === "number" && Number.isInteger(expectedShift),
    );
    const decodedText = $derived(shiftCaesar(cipherText, -shift));
    const cipherAlphabet = $derived(shiftCaesar(CAESAR_ALPHABET, shift));

    $effect(() => {
        cipherText;
        expectedShift;
        shift = 0;
        feedback = "";
    });

    const checkShift = () => {
        if (!validShift || expectedShift === undefined || !cipherText.trim()) return;

        if (shift === normalizeCaesarShift(expectedShift)) {
            feedback = "correct";
            onSolved?.();
        } else {
            feedback = "incorrect";
        }
    };
</script>

<section class="tool-panel">
    <h2>Caesar Solver</h2>
    <div class="cipher-flow">
        <div class="card">
            <span class="step-label">ENCODED MESSAGE</span>
            <p class="cipher-text">{cipherText || "No Caesar message provided."}</p>
        </div>

        <div class="card">
            <p>Adjust the encryption shift to decode the message.</p>
            <CaesarShift bind:shift onChange={() => feedback = ""} />
            <div class="alphabet">
                <span>Plain: {CAESAR_ALPHABET}</span>
                <span>Cipher: {cipherAlphabet}</span>
            </div>
            <button type="button" onclick={checkShift} disabled={!validShift || !cipherText.trim()}>
                Check shift
            </button>
            {#if !validShift}
                <p class="feedback incorrect" role="alert">This cipher has an invalid or missing shift.</p>
            {:else if feedback === "correct"}
                <p class="feedback correct" role="status">✓ Correct shift!</p>
            {:else if feedback === "incorrect"}
                <p class="feedback incorrect" role="status">Not quite. Try another shift.</p>
            {/if}
        </div>

        <div class="card">
            <span class="step-label">DECODED MESSAGE</span>
            <p class="decoded-text">{decodedText || "Your decoded message will appear here."}</p>
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

    h2 {
        margin: 0 0 1.5rem;
        font-size: 1.6rem;
        text-align: center;
    }

    .cipher-flow {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .card {
        padding: 1.25rem;
        background-color: #212425;
        color: #fff;
        border-radius: 15px;
    }

    .card > p:first-child {
        margin-top: 0;
    }

    .step-label {
        display: block;
        margin-bottom: 0.75rem;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.07em;
    }

    .cipher-text, .decoded-text, .alphabet {
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }

    .cipher-text, .alphabet {
        font-family: monospace;
    }

    .cipher-text, .decoded-text {
        margin: 0;
        font-size: 1.15rem;
        line-height: 1.8;
    }

    .decoded-text {
        color: #a7f3d0;
        font-weight: 600;
    }

    .alphabet {
        display: flex;
        flex-direction: column;
        margin: 1rem 0;
    }

    .feedback {
        margin: 0.75rem 0 0;
        padding: 0.65rem 0.8rem;
        border-radius: 6px;
        font-weight: 700;
    }

    .correct {
        background: #d1fae5;
        color: #065f46;
    }

    .incorrect {
        background: #fee2e2;
        color: #991b1b;
    }

    @media (max-width: 480px) {
        .tool-panel, .card {
            padding: 1rem;
        }
    }
</style>
