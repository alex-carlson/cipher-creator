type PixelImage = Pick<ImageData, "data" | "width" | "height">;
type Color = readonly [number, number, number, number];

export function floodFill(image: PixelImage, x: number, y: number, color: Color): boolean {
	const { data, width, height } = image;
	const start = y * width + x;
	const offset = start * 4;
	const target = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];

	if (target.every((channel, index) => channel === color[index])) return false;

	const queue = new Uint32Array(width * height);
	let head = 0;
	let tail = 0;

	const enqueue = (pixel: number) => {
		const i = pixel * 4;
		if (
			data[i] !== target[0] || data[i + 1] !== target[1] ||
			data[i + 2] !== target[2] || data[i + 3] !== target[3]
		) return;

		data[i] = color[0];
		data[i + 1] = color[1];
		data[i + 2] = color[2];
		data[i + 3] = color[3];
		queue[tail++] = pixel;
	};

	enqueue(start);
	while (head < tail) {
		const pixel = queue[head++];
		const column = pixel % width;
		if (column > 0) enqueue(pixel - 1);
		if (column < width - 1) enqueue(pixel + 1);
		if (pixel >= width) enqueue(pixel - width);
		if (pixel < width * (height - 1)) enqueue(pixel + width);
	}

	return true;
}
