export const PIGPEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export const PIGPEN_WEDGES = [
    { path: "M 3 3 L 16 16 L 29 3", dotX: 16, dotY: 9 },
    { path: "M 3 29 L 16 16 L 3 3", dotX: 9, dotY: 16 },
    { path: "M 29 3 L 16 16 L 29 29", dotX: 23, dotY: 16 },
    { path: "M 29 29 L 16 16 L 3 29", dotX: 16, dotY: 23 },
] as const;

export function normalizePigpenKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z]/g, "");
}

export function pigpenAlphabet(key: string): string {
    const uniqueKey = [...new Set(normalizePigpenKey(key))].join("");
    return uniqueKey + [...PIGPEN_ALPHABET].filter((letter) => !uniqueKey.includes(letter)).join("");
}

// Letters in ciphertext identify the 26 fixed symbol positions, not plaintext.
export function encodePigpen(message: string, key: string): string {
    const alphabet = pigpenAlphabet(key);
    return message.replace(/[a-z]/gi, (letter) => {
        const symbol = PIGPEN_ALPHABET[alphabet.indexOf(letter.toLowerCase())];
        return letter === letter.toUpperCase() ? symbol.toUpperCase() : symbol;
    });
}

export function decodePigpen(cipherText: string, key: string): string {
    const alphabet = pigpenAlphabet(key);
    return cipherText.replace(/[a-z]/gi, (symbol) => {
        const letter = alphabet[PIGPEN_ALPHABET.indexOf(symbol.toLowerCase())];
        return symbol === symbol.toUpperCase() ? letter.toUpperCase() : letter;
    });
}
