type BookResult = { ok: true; value: string } | { ok: false; error: string };

function passageWords(passage: string): string[][][] {
    const stanzas: string[][][] = [];
    let stanza: string[][] = [];

    for (const line of passage.split(/\r\n|\r|\n/)) {
        if (!line.trim()) {
            if (stanza.length) stanzas.push(stanza);
            stanza = [];
        } else {
            stanza.push(line.match(/\S+/gu) ?? []);
        }
    }
    if (stanza.length) stanzas.push(stanza);
    return stanzas;
}

export function encodeBook(passage: string, message: string): BookResult {
    const stanzas = passageWords(passage);
    if (!stanzas.length) return { ok: false, error: "Enter a source passage." };
    const words = message.trim().split(/\s+/u).filter(Boolean);
    if (!words.length) return { ok: false, error: "Enter a message to encode." };

    const positions = new Map<string, string>();
    stanzas.forEach((stanza, s) =>
        stanza.forEach((line, l) =>
            line.forEach((word, w) =>
                [...word].forEach((character, c) => {
                    const normalized = character.toLowerCase();
                    if (!positions.has(normalized)) {
                        positions.set(normalized, `${s + 1},${l + 1},${w + 1},${c + 1}`);
                    }
                }),
            ),
        ),
    );

    const encoded: string[] = [];
    for (const word of words) {
        const coordinates: string[] = [];
        for (const character of word) {
            const position = positions.get(character.toLowerCase());
            if (!position) {
                return { ok: false, error: `Character "${character}" does not appear in the source passage.` };
            }
            coordinates.push(position);
        }
        encoded.push(coordinates.join("\n"));
    }
    return { ok: true, value: encoded.join("\n\n") };
}

export function decodeBook(passage: string, cipherText: string): BookResult {
    const stanzas = passageWords(passage);
    if (!stanzas.length) return { ok: false, error: "Enter a source passage." };
    const lines = cipherText.split(/\r\n|\r|\n/);
    const words: string[] = [];
    let word = "";

    for (const line of lines) {
        if (!line.trim()) {
            if (word) words.push(word);
            word = "";
            continue;
        }

        const match = line.match(/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/);
        if (!match) {
            return { ok: false, error: `Invalid coordinate "${line}". Use stanza,line,word,character.` };
        }
        const [s, l, w, c] = match.slice(1).map(Number);
        if (![s, l, w, c].every((number) => Number.isSafeInteger(number) && number > 0)) {
            return { ok: false, error: `Invalid coordinate "${line}": numbers must be positive integers.` };
        }
        const sourceWord = stanzas[s - 1]?.[l - 1]?.[w - 1];
        const character = sourceWord === undefined ? undefined : [...sourceWord][c - 1];
        if (character === undefined) {
            return { ok: false, error: `Coordinate "${line}" is outside the source passage.` };
        }
        word += character;
    }
    if (word) words.push(word);
    if (!words.length) return { ok: false, error: "Enter at least one coordinate." };
    return { ok: true, value: words.join(" ") };
}
