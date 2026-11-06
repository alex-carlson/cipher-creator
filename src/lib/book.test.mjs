import { strict as assert } from "node:assert";
import { test } from "node:test";
import { decodeBook, encodeBook } from "./book.ts";

test("decodes one-based stanza, line, word and character coordinates", () => {
    const passage = "Alpha beta\n  don't   stop!\n\nOne two\nThree four";
    assert.deepEqual(decodeBook(passage, "1,2,1,4\n2,2,2,1\n\n1,1,2,2"), {
        ok: true, value: "'f e",
    });
});

test("handles original line breaks, blank stanzas and Unicode code points", () => {
    const passage = "\r\n😀one  two\r\nsecond line\r\n \r\n\r\nthird  word";
    assert.deepEqual(decodeBook(passage, "1,1,1,1\r\n1,2,1,1\r\n\r\n2,1,2,4"), {
        ok: true, value: "😀s d",
    });
});

test("encodes first matching characters and round-trips words", () => {
    const passage = "Hello, world!\nSphinx of black quartz.";
    const encoded = encodeBook(passage, "hello  WORLD!");
    assert.equal(encoded.ok, true);
    if (encoded.ok) {
        const decoded = decodeBook(passage, encoded.value);
        assert.equal(decoded.ok, true);
        if (decoded.ok) assert.equal(decoded.value.toLowerCase(), "hello world!");
        assert.ok(encoded.value.includes("\n\n"));
    }
});

test("rejects missing characters and invalid or out-of-range coordinates", () => {
    assert.equal(encodeBook("abc", "z").ok, false);
    assert.equal(encodeBook("", "a").ok, false);
    for (const code of ["", "1,1,1,0", "1,2,1,1", "1,1,1,4", "1,1,1", "1,1,1,1x"]) {
        assert.equal(decodeBook("abc", code).ok, false, code);
    }
});
