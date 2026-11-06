export const CAESAR_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export function normalizeCaesarShift(shift: number): number {
    return ((shift % 26) + 26) % 26;
}

export function shiftCaesar(text: string, shift: number): string {
    const normalizedShift = normalizeCaesarShift(shift);

    return text.replace(/[a-z]/gi, (char) => {
        const base = char >= "a" ? 97 : 65;
        return String.fromCharCode(
            base + (char.charCodeAt(0) - base + normalizedShift) % 26,
        );
    });
}
