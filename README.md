# Visual English Studio

**Turn your world into English.** Capture a photo, and get a print-ready English learning poster built from what is actually in the picture — vocabulary, phrases, sentence patterns, a model response and speaking challenges.

The site is a premium dark-violet iOS-style workspace. The posters it produces are warm, editorial, magazine-like pages with a 2:3 portrait canvas — two independent visual systems by design.

```
photo → visual understanding → structured English content → poster layout → high-resolution PNG
```

---

## 1. Quick start

```bash
npm install          # install dependencies
npm run dev          # dev server → http://localhost:5173  (AI API included)
```

That is all you need. **Without any API key the app runs in demo mode**: upload, analysis stages, poster layout, editing, PNG export and the local library all work, using clearly-labelled sample content (a yogurt-bowl lesson). The UI says “Demo mode” everywhere, and the poster itself is marked “Demo sample”.

### Build & run the production server

```bash
npm run build        # type-check + production build into dist/
npm start            # Node server → http://localhost:8080  (app + AI API)
```

`npm run preview` (Vite preview) also mounts the AI API.

### Turn on the real AI

```bash
cp .env.example .env     # then edit .env
```

| Variable         | Required | Meaning                                                                 |
| ---------------- | -------- | ----------------------------------------------------------------------- |
| `VES_AI_API_KEY` | yes      | API key. **Never exposed to the browser** — read only by `server/`.      |
| `VES_AI_BASE_URL`| no       | Any OpenAI-compatible `/chat/completions` endpoint. Default `https://api.openai.com/v1` |
| `VES_AI_MODEL`   | no       | A vision-capable model, e.g. `gpt-4o-mini`.                             |
| `VES_AI_PROVIDER`| no       | Free-form label shown in the UI.                                        |
| `PORT`           | no       | Port for `npm start` (default `8080`).                                   |

The provider is swappable: OpenAI, DeepSeek, Moonshot/Kimi, Gemini’s OpenAI-compatible endpoint, or a local Ollama / LM Studio server all work by changing `VES_AI_BASE_URL` + `VES_AI_MODEL`. No application code depends on the vendor.

Restart the server after editing `.env`. `/api/status` tells the UI whether a provider is configured (no secrets are ever returned).

---

## 2. What you can do

1. **Home** — the product story plus a finished sample poster (“BUILD YOUR BOWL”). You can open the sample poster or start your own.
2. **Upload** — click, drag & drop, or use the camera on a phone. JPEG / PNG / WebP / HEIC up to 12 MB. Replace or remove the photo, and pick the learning mode (Everyday / Academic / Business) and difficulty (Beginner / Intermediate / Advanced) — both really change the generated content.
3. **Analysis** — four honest stages: *Reading your photo → Identifying objects → Finding useful expressions → Building your poster*. No fake percentages. Failures show the real error with **Try again** and **Continue with sample content**.
4. **Poster editor** — live preview of the 800 × 1200 poster next to a content panel. Edit the title, subtitle, theme tag and every line of the five modules; add or remove items; switch the poster theme (Warm Cream / Sage Paper / Blush Ink); adjust photo framing (horizontal, vertical, zoom); regenerate one module or the whole poster; save; export.
5. **Library** — posters saved in IndexedDB on this device, with thumbnails, theme filters and delete. Reopen any poster in the editor. *Data stays in this browser and does not sync between devices.*

### The five modules

| # | Module             | Contents                                                        |
| - | ------------------ | --------------------------------------------------------------- |
| 01 | Vocabulary         | word + 中文 + short English explanation (4–6 items)              |
| 02 | Phrases            | natural phrase + 中文 + when to use it + example (3–5 items)     |
| 03 | Sentence Patterns  | transferable structure + example + substitution chips (1–2)     |
| 04 | Model Response     | one coherent English paragraph reusing the new language + 中文   |
| 05 | Speaking Challenge | 2–3 open questions that cannot be answered with yes/no + 中文    |

---

## 3. How the poster is built (and exported)

* The poster DOM is **800 × 1200 logical pixels** (2:3) and is rendered by one React component (`src/studio/poster/PosterCanvas.tsx`) — the same DOM is used for the preview and for export, so what you edit is what you get.
* **Layout safety:** after every render the poster measures its own columns. If content would overflow, the body base font size is lowered in small steps until everything fits — content is never clipped, it is simply set slightly smaller (web fonts and photo decode trigger a re-measure).
* **Export** (`src/studio/services/posterExport.ts`): the poster node is cloned, `poster.css` is embedded with the self-hosted fonts inlined as base64 data URLs, wrapped in an SVG `<foreignObject>`, rasterized on a canvas and saved as **1600 × 2400** (2×) or **2400 × 3600** (3×) PNG. No editor chrome is included, nothing is blank, and no network access is needed at export time. If PNG ever fails, the app reports a clear error instead of producing a broken file.
* Typography is self-hosted (`public/fonts`, Fraunces + Caveat). The site never depends on an external font link.
* Photos are converted to JPEG data URLs on upload — no blob URLs, no CORS or lifetime problems, and the exact same image is used for preview, analysis, poster and export.

---

## 4. Design systems

Two independent visual systems, on purpose:

* **Site UI** — deep violet spatial background (layered radial gradients, soft ambient orbs), restrained glassmorphism, iOS-style segmented controls, gentle motion that respects `prefers-reduced-motion`. Tokens live in `src/studio/styles/studio-theme.css`.
* **Learning poster** — warm cream paper, dark brown editorial serif, red module numbers, hand-drawn SVG doodles, leader dots, bilingual rows. Tokens live in `src/studio/styles/poster.css` with three themes.

---

## 5. Project structure

```
src/studio/                     Visual English Studio (the product)
  App shell, router, session/
    StudioApp.tsx               shell: header, routes, footer, toasts
    router.tsx                  tiny history-API router (no dependency)
    session/SessionProvider.tsx app state + pipeline orchestration
  pages/                        Home · Upload · Analysis · Editor · Library
  components/                   header, ambient background, segmented control
  poster/
    PosterCanvas.tsx            the 800×1200 poster (screen + export source)
    ScaledPoster.tsx            responsive scaling wrapper
    doodles.tsx                 hand-drawn SVG decorations
    samplePhoto.ts              sample artwork for the example poster
  services/
    aiClient.ts                 calls the same-origin /api/* endpoints
    posterPipeline.ts           photo → objects → content → poster
    contentValidation.ts        strict runtime validation of AI output
    demoContent.ts              clearly-labelled sample content
    imagePrep.ts                validation, decode, downscale to JPEG
    libraryDb.ts                IndexedDB library
    posterExport.ts             high-resolution PNG / SVG export
  styles/
    studio-theme.css            site design tokens + components
    poster.css                  poster design system (export-embedded)
server/                         the secure API (Node, zero dependencies)
  config.mjs                    reads .env — secrets never leave the server
  ai-provider.mjs               OpenAI-compatible vision call + retries
  prompts.mjs                   the three prompts (identify / generate / module)
  validate-poster.mjs           server-side structural validation
  ai-handler.mjs                /api/status · /api/identify · /api/generate · /api/generate-module
  ves-server.mjs                production server (static + SPA fallback + API)
```

The previous app that lived in this directory (a speaking-practice trainer) is preserved untouched and still runs at **`/speaking`**.

---

## 6. Scripts

| Command          | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `npm run dev`    | Vite dev server with the AI API mounted (port 5173)       |
| `npm run build`  | `tsc -b` type-check + production build                     |
| `npm start`      | Production Node server (serves `dist/` + `/api/*`)         |
| `npm run preview`| Vite preview, also with the AI API                         |
| `npm run lint`   | oxlint                                                    |

---

## 7. Notes & limits

* **AI not configured → demo mode.** The whole product works, and every surface (header, analysis, poster footline) says the content is a sample. Configure `VES_AI_API_KEY` to analyse your own photos.
* **AI output is validated, never faked.** Responses are checked structurally on the server *and* the client; unusable responses produce an error and a retry instead of silent fake data.
* **Only what is really visible.** The prompts forbid inventing objects, and the poster’s photo annotations come from the detected-objects stage.
* **Library is local.** Posters live in IndexedDB in the current browser profile. Clearing site data removes them; private windows may not persist them.
* **Browser support:** modern Chrome, Edge, Safari and Firefox. Export uses SVG `foreignObject` rasterization, which all of them support.
