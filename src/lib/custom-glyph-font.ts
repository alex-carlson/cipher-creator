import opentype from "opentype.js";

const { Font, Glyph: FontGlyph, Path } = opentype;

export type CustomGlyphFontGlyph = {
	char: string;
	dataUrl: string;
};

const createFontPath = async (glyph: CustomGlyphFontGlyph) => {
	const image = new Image();
	const imageLoaded = new Promise<void>((resolve, reject) => {
		image.onload = () => resolve();
		image.onerror = () =>
			reject(new Error(`Could not read the drawing for "${glyph.char}".`));
	});

	image.src = glyph.dataUrl;
	await imageLoaded;

	const canvas = document.createElement("canvas");
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Could not read a glyph drawing.");
	}

	context.drawImage(image, 0, 0);
	const { data, width, height } = context.getImageData(
		0,
		0,
		canvas.width,
		canvas.height,
	);
	const path = new Path();
	const scale = 1000 / Math.max(width, height);
	let contourCount = 0;

	for (let y = 0; y < height; y++) {
		let x = 0;

		while (x < width) {
			while (x < width && data[(y * width + x) * 4 + 3] < 128) {
				x++;
			}

			const start = x;

			while (x < width && data[(y * width + x) * 4 + 3] >= 128) {
				x++;
			}

			if (start === x) continue;

			contourCount++;
			if (contourCount > 16_383) {
				throw new Error(
					"A glyph is too detailed to export. Lower the canvas resolution and try again.",
				);
			}

			const left = start * scale;
			const right = x * scale;
			const top = 1000 - y * scale;
			const bottom = 1000 - (y + 1) * scale;

			path.moveTo(left, top);
			path.lineTo(right, top);
			path.lineTo(right, bottom);
			path.lineTo(left, bottom);
			path.closePath();
		}
	}

	return path;
};

export const downloadCustomGlyphFont = async (
	glyphs: readonly CustomGlyphFontGlyph[],
) => {
	const seenUnicodes = new Set([32]);
	const fontGlyphs = [
		new FontGlyph({
			name: ".notdef",
			advanceWidth: 1000,
			path: new Path(),
		}),
		new FontGlyph({
			name: "space",
			unicode: 32,
			advanceWidth: 500,
			path: new Path(),
		}),
	];

	for (const glyph of glyphs) {
		const char = glyph.char.trim();
		const characters = [...char];
		if (characters.length !== 1) {
			throw new Error(
				`"${char}" must be a single character to export as a font glyph.`,
			);
		}

		const unicodeCandidates = [char.codePointAt(0)];
		const uppercase = char.toUpperCase();
		if ([...uppercase].length === 1) {
			unicodeCandidates.push(uppercase.codePointAt(0));
		}

		const unicodes = [...new Set(unicodeCandidates)].filter(
			(codepoint): codepoint is number =>
				codepoint !== undefined && !seenUnicodes.has(codepoint),
		);

		if (unicodes.length === 0) continue;
		unicodes.forEach((codepoint) => seenUnicodes.add(codepoint));

		fontGlyphs.push(
			new FontGlyph({
				name: `glyph-${unicodes[0]}`,
				unicodes,
				advanceWidth: 1000,
				path: await createFontPath({ ...glyph, char }),
			}),
		);
	}

	if (fontGlyphs.length === 2) {
		throw new Error("Add at least one custom glyph before downloading.");
	}

	const font = new Font({
		familyName: "Custom Glyph",
		styleName: "Regular",
		unitsPerEm: 1000,
		ascender: 1000,
		descender: 0,
		glyphs: fontGlyphs,
	});
	const fontUrl = URL.createObjectURL(
		new Blob([font.toArrayBuffer()], { type: "font/ttf" }),
	);
	const link = document.createElement("a");
	link.href = fontUrl;
	link.download = "custom-glyph-font.ttf";
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(fontUrl), 1000);
};
