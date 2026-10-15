
export const glyphGuesses = $state<Record<string, string>>({});

export function clearGlyphGuesses() {
    for (const key of Object.keys(glyphGuesses)) {
        delete glyphGuesses[key];
    }
}