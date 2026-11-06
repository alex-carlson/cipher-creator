import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeCaesarShift, shiftCaesar } from "./caesar.ts";

test("shifts letters while preserving case and other characters", () => {
    assert.equal(shiftCaesar("Hello, World! 123 café", 3), "Khoor, Zruog! 123 fdié");
});

test("wraps in both directions and normalizes shifts", () => {
    assert.equal(shiftCaesar("aAzZ", 1), "bBaA");
    assert.equal(shiftCaesar("aAzZ", -1), "zZyY");
    assert.equal(normalizeCaesarShift(-1), 25);
    assert.equal(normalizeCaesarShift(26), 0);
    assert.equal(shiftCaesar("abc", 29), "def");
});

test("every shift round-trips", () => {
    const message = "Attack at Dawn! 123";
    for (let shift = 0; shift < 26; shift++) {
        assert.equal(shiftCaesar(shiftCaesar(message, shift), -shift), message);
    }
});
