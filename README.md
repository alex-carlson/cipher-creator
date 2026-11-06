# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Caesar cipher

Add Caesar in the creator and use the down/up arrows to choose an encryption
shift from 0 to 25. Letters rotate forward, wrapping around the alphabet;
case and non-ASCII letters, numbers, and punctuation are preserved.
In solve mode, use the arrows to try the encryption shift and select
**Check shift** to confirm it.

## Pigpen cipher

Add Pigpen and enter a keyword to arrange all 26 letters across the standard
grid and X symbols, with dots for the second set of each shape. Repeated
keyword letters are used once, followed by the remaining letters in alphabetical
order. Solvers can enter a keyword to see its symbol key and decoded message;
an equivalent decoding also counts as solved.

## Book cipher

Paste the source passage with its original line breaks. Blank lines separate
stanzas; within each stanza, lines are counted exactly as entered. Words are
whitespace-separated and punctuation counts as a character. Coordinates are
1-based `stanza,line,word,character`, one per line, with blank lines separating
message words. The source is displayed without visual line wrapping.

Enter a message to generate coordinates using the first occurrence of each
character, or enter existing coordinates to use a specific code. Message
whitespace is normalized to spaces and answer checking ignores case. Every
message character must appear in the passage.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.17.0 create --template minimal --types ts --install npm cipher-creator
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
