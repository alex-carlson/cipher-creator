import { strict as assert } from "node:assert";
import { test } from "node:test";
import { floodFill } from "./flood-fill.ts";

test("fills only the connected region, respecting boundaries and alpha", () => {
	const transparent = [0, 0, 0, 0];
	const barrier = [10, 20, 30, 255];
	const pixels = [
		transparent, barrier, transparent,
		transparent, barrier, transparent,
		barrier, transparent, transparent,
	];
	const image = { width: 3, height: 3, data: new Uint8ClampedArray(pixels.flat()) };
	const color = [100, 120, 140, 255];

	assert.equal(floodFill(image, 0, 0, color), true);
	assert.deepEqual(Array.from(image.data), [
		color, barrier, transparent,
		color, barrier, transparent,
		barrier, transparent, transparent,
	].flat());
});

test("leaves an area unchanged when it already has the selected color", () => {
	const image = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) };
	assert.equal(floodFill(image, 0, 0, [1, 2, 3, 255]), false);
	assert.deepEqual(Array.from(image.data), [1, 2, 3, 255]);
});
