<script lang="ts">
    import { createEventDispatcher } from "svelte";

    type MorseConfig = {
        message: string;
        cipherText: string;
    };

    const dispatch = createEventDispatcher<{
        cipherChange: MorseConfig;
    }>();

    let message = $state("");

    const morseAlphabet: Record<string, string> = {
        a: ".-",
        b: "-...",
        c: "-.-.",
        d: "-..",
        e: ".",
        f: "..-.",
        g: "--.",
        h: "....",
        i: "..",
        j: ".---",
        k: "-.-",
        l: ".-..",
        m: "--",
        n: "-.",
        o: "---",
        p: ".--.",
        q: "--.-",
        r: ".-.",
        s: "...",
        t: "-",
        u: "..-",
        v: "...-",
        w: ".--",
        x: "-..-",
        y: "-.--",
        z: "--..",

        "0": "-----",
        "1": ".----",
        "2": "..---",
        "3": "...--",
        "4": "....-",
        "5": ".....",
        "6": "-....",
        "7": "--...",
        "8": "---..",
        "9": "----.",

        ".": ".-.-.-",
        ",": "--..--",
        "?": "..--..",
        "'": ".----.",
        "!": "-.-.--",
        "/": "-..-.",
        "(": "-.--.",
        ")": "-.--.-",
        "&": ".-...",
        ":": "---...",
        ";": "-.-.-.",
        "=": "-...-",
        "+": ".-.-.",
        "-": "-....-",
        _: "..--.-",
        '"': ".-..-.",
        $: "...-..-",
        "@": ".--.-.",
    };

    const cipherText = $derived(
        message
            .toLowerCase()
            .split("")
            .map((char) => {
                if (char === " ") return "/";
                return morseAlphabet[char] ?? char;
            })
            .join(" "),
    );

    let lastDispatched = "";

    $effect(() => {
        const config: MorseConfig = {
            message,
            cipherText,
        };

        const serialized = JSON.stringify(config);

        if (serialized === lastDispatched) return;

        lastDispatched = serialized;
        dispatch("cipherChange", config);
    });
</script>

<div class="cipher">
    <label for="morse-message">English message</label>
    <input
        bind:value={message}
        type="text"
        id="morse-message"
        name="message"
        placeholder="Enter a message..."
    />

    <label for="morse-output">Morse code</label>
    <output id="morse-output" class="morse-output">
        {cipherText}
    </output>
</div>

<style>
    .cipher {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .morse-output {
        display: block;
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-family: monospace;
        overflow-wrap: anywhere;
        min-height: 1.5rem;
    }
</style>
