function getCipherComplexity(cipher) {
    const codes = cipher.codes ?? [];

    if (codes.length === 0) return 1;

    const scores = codes.map((code) => {
        const message = code.message ?? code.cipherText ?? "";
        const messageLength = message.length;

        if (code.type === "custom-glyph") {
            const glyphCount = code.glyphs?.length ?? 0;
            const ratio = glyphCount / Math.max(messageLength, 1);

            if (ratio <= 0.25) return 1;
            if (ratio <= 0.5) return 2;
            if (ratio <= 0.75) return 3;
            if (ratio <= 1) return 4;
            return 5;
        }

        // Other cipher types: difficulty based on message length
        if (messageLength <= 10) return 1;
        if (messageLength <= 25) return 2;
        if (messageLength <= 50) return 3;
        if (messageLength <= 100) return 4;
        return 5;
    });

    const averageScore =
        scores.reduce((total, score) => total + score, 0) / scores.length;

    // Add a small bonus for having multiple codes
    const codeBonus = Math.min(codes.length - 1, 2) * 0.5;

    return Math.min(5, Math.max(1, Math.round(averageScore + codeBonus)));
}

export { getCipherComplexity };