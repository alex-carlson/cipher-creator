<script lang="ts" module>
	function drawGlyph(canvas: HTMLCanvasElement, dataUrl: string) {
		let image: HTMLImageElement | undefined;

		const render = () => {
			const context = canvas.getContext("2d");
			if (!context) return;

			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = "#fff";
			context.fillRect(0, 0, canvas.width, canvas.height);

			if (image?.complete && image.naturalWidth > 0) {
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
			}
		};

		const load = (src: string) => {
			image = new Image();
			image.onload = render;
			image.src = src;
			render();
		};

		load(dataUrl);

		return {
			update(nextDataUrl: string) {
				if (nextDataUrl !== dataUrl) {
					dataUrl = nextDataUrl;
					load(dataUrl);
				}
			},
			destroy() {
				if (image) image.onload = null;
			},
		};
	}
</script>

<script lang="ts">
	import { glyphGuesses, clearGlyphGuesses } from "./glyphGuesses.svelte";
	import { onDestroy } from "svelte";

	onDestroy(() => {
		clearGlyphGuesses();
	});

	let glyphScale = $state(1);

	const decreaseScale = () => {
		glyphScale = Math.max(0.6, +(glyphScale - 0.1).toFixed(1));
	};

	const increaseScale = () => {
		glyphScale = Math.min(2, +(glyphScale + 0.1).toFixed(1));
	};

	type Glyph = {
		id: number;
		char: string;
		dataUrl: string;
	};

	type CustomGlyphProps = {
		glyphs?: Glyph[];
		message?: string;
	};

	let { glyphs: glyphList = [], message = "" }: CustomGlyphProps = $props();

	const normalize = (value: string) => value.trim().toUpperCase();

	const glyphByChar = $derived.by(() => {
		const map = new Map<string, Glyph>();

		for (const glyph of glyphList) {
			const key = normalize(glyph.char);
			if (key && !map.has(key)) map.set(key, glyph);
		}

		return map;
	});

	// Split the encoded message into glyphs, spaces, and punctuation.
	const sentenceTokens = $derived.by(() => {
		const tokens: Array<{
			id: string;
			char: string;
			glyph?: Glyph;
			key?: string;
		}> = [];

		for (let i = 0; i < [...message].length; i++) {
			const chars = [...message];
			const remaining = chars.slice(i).join("");

			// Prefer the longest matching glyph symbol.
			const match = [...glyphByChar.entries()]
				.sort((a, b) => [...b[0]].length - [...a[0]].length)
				.find(([symbol]) => remaining.toUpperCase().startsWith(symbol));

			if (match) {
				const [key, glyph] = match;
				tokens.push({
					id: `${i}-${glyph.id}`,
					char: chars.slice(i, i + [...key].length).join(""),
					glyph,
					key,
				});
				i += [...key].length - 1;
			} else {
				tokens.push({
					id: `text-${i}`,
					char: chars[i],
				});
			}
		}

		return tokens;
	});

	const isCorrect = (key: string) =>
		normalize(glyphGuesses[key] ?? "") === key &&
		(glyphGuesses[key] ?? "").trim().length > 0;

	const allSolved = $derived.by(() => {
		const keys = [
			...new Set(
				sentenceTokens
					.filter((token) => token.key)
					.map((token) => token.key!),
			),
		];

		return keys.length > 0 && keys.every(isCorrect);
	});
</script>

<section class="tool-panel">
	<h2>Custom Glyph Solver</h2>
	<p>Decode the message by entering a guess under each glyph.</p>

	<div class="sentence-toolbar">
		<span>Glyph size</span>

		<button
			type="button"
			onclick={decreaseScale}
			disabled={glyphScale <= 0.6}
			aria-label="Decrease glyph size"
			title="Decrease glyph size"
		>
			−
		</button>

		<span class="scale-value">{Math.round(glyphScale * 100)}%</span>

		<button
			type="button"
			onclick={increaseScale}
			disabled={glyphScale >= 2}
			aria-label="Increase glyph size"
			title="Increase glyph size"
		>
			+
		</button>
	</div>

	<div
		class:solved={allSolved}
		class="sentence"
		style={`--glyph-scale: ${glyphScale}`}
	>
		{#each sentenceTokens as token (token.id)}
			{#if token.glyph && token.key}
				{@const key = token.key}

				<div class="sentence-glyph">
					<canvas
						width="64"
						height="64"
						aria-label="Unknown glyph"
						use:drawGlyph={token.glyph.dataUrl}
					></canvas>

					<input
						type="text"
						value={glyphGuesses[key] ?? ""}
						oninput={(event) => {
							glyphGuesses[key] = event.currentTarget.value;
						}}
						placeholder="?"
						autocomplete="off"
						spellcheck="false"
						aria-label="Guess for glyph"
					/>
				</div>
			{:else}
				<span class="sentence-character">{token.char}</span>
			{/if}
		{/each}
	</div>

	{#if allSolved}
		<p class="success-message">Great job! You solved the message.</p>
	{:else}
		<p class="hint">
			The message will be solved when every glyph is correct.
		</p>
	{/if}
</section>

<style>
	.sentence-toolbar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-block: 1rem 0.5rem;
	}

	.sentence-toolbar > span:first-child {
		font-weight: 500;
	}

	.sentence-toolbar button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		font-size: 1.4rem;
		line-height: 1;
		border: 1px solid #b8bec9;
		border-radius: 6px;
		background: #fff;
		color: #253047;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			opacity 0.15s ease;
	}

	.sentence-toolbar button:hover:not(:disabled) {
		background: #f0f3f8;
		border-color: #818da0;
	}

	.sentence-toolbar button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.scale-value {
		min-width: 3.5rem;
		text-align: center;
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	.sentence {
		--glyph-scale: 1;

		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: calc(0.35rem * var(--glyph-scale));
		margin-block: 1.5rem;
		padding: 0.75rem;
		line-height: 1.5;
		border: 1px solid #ccc;
		border-radius: 0.5rem;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.sentence.solved {
		background: #dcfce7;
		border-color: #16a34a;
	}

	.sentence-glyph {
		position: relative;
		display: inline-flex;
		flex: 0 0 calc(76px * var(--glyph-scale));
		flex-direction: column;
		align-items: center;
		gap: calc(0.4rem * var(--glyph-scale));
		width: calc(76px * var(--glyph-scale));
		padding: calc(0.2rem * var(--glyph-scale));
		border-radius: 0.4rem;
	}

	.sentence-glyph canvas {
		display: block;
		width: calc(64px * var(--glyph-scale));
		height: calc(64px * var(--glyph-scale));
		background: #fff;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
		object-fit: contain;
	}

	.sentence-glyph input {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		height: calc(52px * var(--glyph-scale));
		padding: 0.4rem;

		font-family: "Comic Sans MS", "Segoe Print", cursive;
		font-size: calc(1.6rem * var(--glyph-scale));
		font-weight: 500;
		line-height: 1;
		text-align: center;
		color: #253047;

		background: #fffdf5;
		border: 2px solid #b8bec9;
		border-bottom: 3px solid #8b95a5;
		border-radius: $border-radius;
		outline: none;
		box-shadow: 0 2px 3px rgb(0 0 0 / 5%);

		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			background-color 0.15s ease;
	}

	.sentence-glyph input::placeholder {
		color: #c1c5cd;
		opacity: 1;
	}

	.sentence-glyph input:hover {
		border-color: #818da0;
	}

	.sentence-glyph input:focus {
		background: #fff;
		border-color: #5278c7;
		border-bottom-color: #365ba8;
		box-shadow: 0 0 0 3px rgb(82 120 199 / 16%);
	}

	.sentence.solved .sentence-glyph input {
		background: #f0fdf4;
		border-color: #16a34a;
		border-bottom-color: #15803d;
	}

	.sentence-character {
		padding-bottom: calc(0.65rem * var(--glyph-scale));
		font-size: calc(1rem * var(--glyph-scale));
		white-space: pre;
		margin: 0 0.4em;
	}

	.success-message {
		color: #15803d;
		font-weight: 600;
	}

	.hint {
		color: #777;
	}

	@media (max-width: 480px) {
		.sentence {
			padding: 0.5rem;
			gap: calc(0.25rem * var(--glyph-scale));
		}

		.sentence-toolbar {
			gap: 0.4rem;
		}
	}
</style>
