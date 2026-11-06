import { strict as assert } from "node:assert";
import { test } from "node:test";
import { syncMessageGlyphs } from "./message-glyphs.ts";

test("adds digits once and removes them only after their last occurrence", () => {
    let id = 1;
    const nextId = () => id++;
    const initial = syncMessageGlyphs("A112", [], nextId);
    assert.deepEqual(initial.map((glyph) => glyph.char), ["a", "1", "2"]);
    initial[1].dataUrl = "drawing";

    const oneRemaining = syncMessageGlyphs("a1", initial, nextId);
    assert.deepEqual(oneRemaining.map((glyph) => glyph.char), ["a", "1"]);
    assert.equal(oneRemaining[1].dataUrl, "drawing");
    assert.equal(syncMessageGlyphs("a1", oneRemaining, nextId), oneRemaining);

    const removed = syncMessageGlyphs("a", oneRemaining, nextId);
    assert.deepEqual(removed.map((glyph) => glyph.char), ["a"]);
    const addedAgain = syncMessageGlyphs("a1", removed, nextId);
    assert.equal(addedAgain[1].char, "1");
    assert.notEqual(addedAgain[1].id, initial[1].id);
    assert.equal(addedAgain[1].dataUrl, "");
});

test("clearing the message removes numbers while retaining other glyphs", () => {
    const glyphs = [
        { id: 1, char: "a", dataUrl: "a drawing" },
        { id: 2, char: "0", dataUrl: "0 drawing" },
        { id: 3, char: "10", dataUrl: "custom drawing" },
    ];
    assert.deepEqual(syncMessageGlyphs("", glyphs, () => 4), [glyphs[0], glyphs[2]]);
});
