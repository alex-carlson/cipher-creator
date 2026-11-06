export type MessageGlyph = {
    id: number;
    char: string;
    dataUrl: string;
};

export function syncMessageGlyphs(
    message: string,
    glyphs: MessageGlyph[],
    nextId: () => number,
): MessageGlyph[] {
    const requiredChars = new Set(
        [...message.toLowerCase()].filter((char) => /^[a-z0-9]$/.test(char)),
    );
    const retained = glyphs.filter((glyph) => {
        const char = glyph.char.trim().toLowerCase();
        return !/^[0-9]$/.test(char) || requiredChars.has(char);
    });
    const existingChars = new Set(retained.map((glyph) => glyph.char.trim().toLowerCase()));
    const missingChars = [...requiredChars].filter((char) => !existingChars.has(char));

    if (retained.length === glyphs.length && missingChars.length === 0) return glyphs;

    return [
        ...retained,
        ...missingChars.map((char) => ({ id: nextId(), char, dataUrl: "" })),
    ];
}
