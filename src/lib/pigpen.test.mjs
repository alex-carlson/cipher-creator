import { strict as assert } from "node:assert";
import { test } from "node:test";
import { decodePigpen, encodePigpen, normalizePigpenKey, pigpenAlphabet, PIGPEN_WEDGES } from "./pigpen.ts";

test("orders X symbols north, west, east, south with dots in the matching wedges", () => {
    assert.deepEqual(PIGPEN_WEDGES, [
        { path: "M 3 3 L 16 16 L 29 3", dotX: 16, dotY: 9 },
        { path: "M 3 29 L 16 16 L 3 3", dotX: 9, dotY: 16 },
        { path: "M 29 3 L 16 16 L 29 29", dotX: 23, dotY: 16 },
        { path: "M 29 29 L 16 16 L 3 29", dotX: 16, dotY: 23 },
    ]);
});

test("builds a complete keyword alphabet, ignoring repeated letters", () => {
    assert.equal(normalizePigpenKey("BaL-loon!"), "balloon");
    assert.equal(pigpenAlphabet("BaL-loon!"), "baloncdefghijkmpqrstuvwxyz");
    assert.equal(new Set(pigpenAlphabet("keyword")).size, 26);
});

test("maps plaintext to fixed symbol positions with a keyword", () => {
    assert.equal(encodePigpen("Keyword, xyz! 123", "keyword"), "Abcdefg, ycz! 123");
    assert.equal(decodePigpen("Abcdefg, ycz! 123", "keyword"), "Keyword, xyz! 123");
    assert.notEqual(encodePigpen("hello", "keyword"), encodePigpen("hello", "other"));
});

test("round-trips the alphabet, case, punctuation, and non-ASCII text", () => {
    const message = "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz café 123!\n";
    for (const key of ["keyword", "balloon", "z", ""]) {
        assert.equal(decodePigpen(encodePigpen(message, key), key), message);
    }
});
