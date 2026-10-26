# Harper Editor

Harper Editor is a lightweight, browser-based writing editor with inline spelling and grammar feedback. It uses [Harper](https://github.com/Automattic/harper), an open-source English grammar checker, to analyze text as you write and suggest corrections you can apply from the editor.

## Features

- **Live writing feedback:** Checks your text after a short pause in typing instead of on every keystroke.
- **Inline issue highlights:** Marks detected issues with a wavy underline.
- **Explanations and suggestions:** Select an underlined issue to read Harper's explanation and available replacements.
- **One-click corrections:** Apply a suggestion directly to the text; the updated text is checked again.
- **Client-side linting:** Harper runs in a web worker in the browser. This project does not configure a writing-text API or server-side persistence.
- **Responsive editor layout:** Built with reusable UI components and Tailwind CSS.

Harper is configured for **American English** in the current implementation. Suggestions are automated guidance; review them for context before accepting.

## Benefits

- **Stay in your writing flow:** Review explanations and apply corrections without leaving the editor.
- **Keep processing close to the user:** Text is linted by a browser worker, with no writing-text service or backend required by this project.
- **Get quick feedback:** Debounced checks balance responsive results with avoiding a lint request on every keystroke.
- **Start simply:** The app needs no account, database, or API key to run locally.

## Technology

- [Next.js](https://nextjs.org/) 16 with the App Router
- [React](https://react.dev/) 19 and [TypeScript](https://www.typescriptlang.org/)
- [Harper.js](https://www.npmjs.com/package/harper.js) for grammar and spelling linting
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Base UI](https://base-ui.com/) and locally maintained shadcn-style UI components
- [Lucide React](https://lucide.dev/) for icons

## Getting started

### Requirements

- Node.js (use a current LTS release)
- npm

### Install and run

From the project directory, install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Harper initializes when the editor loads; the status area indicates whether it is ready or failed to load.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server using the webpack dev bundler. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build (run `npm run build` first). |

To test the production build locally:

```bash
npm run build
npm run start
```

Then open [http://localhost:3000](http://localhost:3000).

## Using the editor

1. Open the app in your browser.
2. Type or edit text in the editor.
3. Pause briefly. Harper checks the text after approximately 400 ms and highlights detected issues.
4. Select an underlined portion to see Harper's explanation and any suggested replacements.
5. Select a suggestion to apply it. The editor updates and checks the revised text.

Some lint results may not have an automatic suggestion. In that case, use Harper's explanation to make a manual edit.

## Project structure

```text
app/
  page.tsx                  Main page and editor entry point
  layout.tsx                Root layout, fonts, and page metadata
  globals.css               Global styles and Tailwind theme
components/
  highlighted-editor.tsx    Main inline-highlight editor
  spell-editor.tsx          Alternative suggestions-list editor component
  ui/                       Reusable interface components
hooks/
  use-harper-linter.ts      Harper worker initialization and lint helpers
lib/
  utils.ts                  Shared UI utilities
```

The home page renders `HighlightedEditor`. `SpellEditor` is also included as an alternate editor UI component, but is not currently mounted on the home page.

## How it works

The editor loads Harper.js and its inlined binary in the browser, creates a Harper worker linter configured for American English, and sends text for linting after the debounce interval. Lint results are rendered as an overlay aligned with the editable text area. Selecting a result opens a popover with its message and available suggestions.

Text is held in the editor's client-side state. The current app does not save documents or connect to an account, database, or external writing service.

## Customization

- Change the page content or editor placement in `app/page.tsx`.
- Change the initial text, linting behavior, or editor interaction in `components/highlighted-editor.tsx`.
- Change Harper initialization or its configured dialect in `hooks/use-harper-linter.ts`.
- Update global theme and styles in `app/globals.css`.
