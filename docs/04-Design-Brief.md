# Design brief — AwkBeats Prep Station

## Document control

| Field | Value |
| --- | --- |
| Project | AwkBeats Prep Station |
| Document title | Design Brief |
| Document ID | ABP-DESIGN |
| Version | 1.1 |
| Status | Final (as shipped) |
| Last updated | 2026-10-21 (UTC) |
| Author | Cursor Agent, for owner Awkward J |
| Repo | https://github.com/Awkward8787/awkbeats-prep-station |
| Branch | `cursor/awkbeats-prep-station-e2e2` |
| Commit SHA | f99d3c6a38ad256e123fa13b50e0f7660369bd61 |
| Live URL | None. Brand site: https://awkbeats.com |
| Operator | Awkward J (legal entity UNCONFIRMED) |

## Table of contents

1. Brand
2. Logo
3. Color
4. Typography
5. Spacing and layout
6. Shape and depth
7. Components
8. Iconography
9. Motion
10. Imagery
11. Voice
12. Accessibility rules
13. References
14. Do and don't
15. Screens
16. Glossary
17. Open questions
18. Changelog
19. Sources

## 1. Brand

Name: AwkBeats. Product: Prep Station. Producer: Awkward J. Site: https://awkbeats.com.

Tagline: none in the product. The top bar subtitle is "Prep Station".

The interface should feel like a studio tool: dark, quiet, gold used for the brand and for the key badge, numbers in a monospace face so BPM columns line up.

Personality, each as a contrast the UI should hold:

- Precise, not playful. BPM is `140.25`, not "about 140".
- Calm, not nightclub. No animated gradients, no strobe on the waveform.
- Direct, not chatty. Buttons say "Write tags to file", not "Let's save your vibe".
- Local, not cloudy. No account avatar, no sync icon.

Audience reminder: a producer at a desk, often for hours. Density is welcome. Decoration is not.

## 2. Logo and mascot

There is no mascot. The mark is the owner's AwkBeats iOS icon: a gold A with a purple inner facet. Q-004 is resolved.

| Asset | Path | Use |
| --- | --- | --- |
| App icon | `build/icon.png` 1024×1024, opaque, black ground | Source for every installer target |
| macOS icon | `build/icon.icns` | `electron-builder.yml` `mac.icon` and `dmg.icon`. PNG chunks icp4, icp5, ic11, icp6, ic12, ic07, ic08, ic13, ic09, ic14, ic10 |
| Windows icon | `build/icon.ico` | `win.icon`, NSIS installer and uninstaller. Sizes 16, 24, 32, 48, 64, 128, 256 |
| Linux icons | `build/icons/<size>x<size>.png` | `linux.icon`. Sizes 16, 24, 32, 48, 64, 128, 256, 512, 1024 |
| In-app mark | `build/logo.png` 1024×1024, RGBA | Title bar, empty states, about panel. `BrandMark` in `src/renderer/App.tsx` is 36×36. Empty state is 88×88 |

Clear space: keep at least a quarter of the mark's height empty around it in marketing. Do not recolor the gold or the purple, do not stretch it, and do not put the opaque black square in the title bar. The title bar and empty states use the transparent file so the A sits on `#0c0d10`. The retired AJ waveform is not in the repo.

There is no Open Graph image and no favicon separate from the app icon. Not applicable for a desktop window.

## 3. Color

Tokens are in `src/renderer/styles.css` on `:root`. Ratios were computed with the WCAG relative-luminance formula on 2026-10-21.

| Token | Hex | RGB | Role |
| --- | --- | --- | --- |
| `--bg` | `#0c0d10` | 12, 13, 16 | Window background |
| `--bg-rail` | `#101114` | 16, 17, 20 | Top bar, rail, inspector, footer |
| `--bg-elev` | `#17191e` | 23, 25, 30 | Inputs, analysis card, buttons |
| `--bg-elev-2` | `#21242b` | 33, 36, 43 | Pills, play button |
| `--bg-active` | `#2a2418` | 42, 36, 24 | Selected table row |
| `--line` | `#2c3038` | 44, 48, 56 | Hairline borders |
| `--line-strong` | `#3c414b` | 60, 65, 75 | Button borders |
| `--text` | `#f4f0e8` | 244, 240, 232 | Primary text |
| `--text-dim` | `#b7b1a6` | 183, 177, 166 | Secondary text |
| `--text-faint` | `#938d85` | 147, 141, 133 | Labels, counts, section titles |
| `--gold` | `#e4b15a` | 228, 177, 90 | Accent, primary button |
| `--gold-2` | `#f3d7a4` | 243, 215, 164 | Gold text, focus |
| `--gold-dim` | `rgba(228,177,90,0.16)` | — | Tag chip fill |
| `--mint` | `#8ee0b8` | 142, 224, 184 | Status Ready |
| `--blue` | `#9eb6f0` | 158, 182, 240 | Status Leased |
| `--coral` | `#f09a86` | 240, 154, 134 | Destructive text |
| `--violet` | `#d2b0f0` | 210, 176, 240 | Status Sold |
| `--danger` | `#ff6d6d` | 255, 109, 109 | Reserved danger |
| `--focus` | `#f3d7a4` | 243, 215, 164 | Focus ring |
| Table header background | `#12141a` | 18, 20, 26 | Sticky header, not a token |
| Primary ink | `#1a1408` | 26, 20, 8 | Text on gold buttons |
| Modal surface | `#14161b` | 20, 22, 27 | Dialogs |
| Toast surface | `#242017` | 36, 32, 23 | Toasts |

| Pair | Ratio | WCAG |
| --- | --- | --- |
| `--text` on `--bg` | 17.10 | AAA |
| `--text-dim` on `--bg` | 9.12 | AAA |
| `--text-faint` on `--bg` | 5.68 | AA |
| `--text-faint` on `--bg-rail` | 5.52 | AA |
| `--text-faint` on `#12141a` | 5.39 | AA |
| `--text-faint` on `--bg-elev` | 5.14 | AA |
| `--text-faint` on `--bg-active` | 4.50 | AA |
| `--gold` on `--bg` | 9.93 | AAA |
| `--gold-2` on `--bg` | 13.94 | AAA |
| `#1a1408` on `--gold` | 9.36 | AAA |
| `--mint` on `--bg` | 12.50 | AAA |
| `--blue` on `--bg` | 9.63 | AAA |
| `--coral` on `--bg` | 8.95 | AAA |
| `--danger` on `--bg` | 7.09 | AAA |
| `--text` on `--bg-active` | 13.55 | AAA |
| `--text` on `--bg-elev` | 15.47 | AAA |

Status dots are 8px circles plus the status word. Gold means in progress, mint means ready, blue means leased, violet means sold, faint means idea. The word is always present, so a color-blind producer is not relying on the dot.

`--text-faint` was `#7e786e` during the first screenshots and measured 4.44:1 on `--bg` and 4.02:1 on `--bg-elev`, which misses AA for small text. It was changed to `#938d85` before the shipping commit. Section titles are 11px uppercase, so they need AA, not large-text AA.

## 4. Typography

Families, self-hosted from `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`, SIL Open Font License 1.1. Weights loaded in `src/renderer/main.tsx`: sans 400, 500, 600; mono 500. Fallback: `'Segoe UI', sans-serif` and `ui-monospace, monospace`.

| Level | Size | Line height | Tracking | Weight | Where |
| --- | --- | --- | --- | --- | --- |
| Body | 14px | 1.45 | 0 | 400 | `body` |
| Brand name | 13px | — | 0.14em | 600 | `.brand-name` |
| Subtitle | 11px | — | 0.08em | 400, uppercase | `.brand-sub` |
| Section label | 11px | — | 0.12em | 600, uppercase | `.section-label`, rail `h2` |
| Inspector title | 20px | — | 0 | 600 | `.inspector-head h3` |
| Tempo | 40px | 1 | -0.04em | 500 mono | `.tempo` |
| Key | 18px | — | 0 | 400 | `.key-line` |
| Table header | 11px | — | 0.08em | 600, uppercase | `.tracks th` |
| BPM cells | 14px | — | 0 | 500 mono | `.mono` |
| Footer | 12px | — | 0 | 400 | `.footer` |
| Empty title | 22px | — | 0 | 600 | `.empty h2` |
| Dialog title | 18px | — | 0 | 600 | `.modal h2` |
| Button | 14px | — | 0 | 400, primary 600 | `.btn` |

No responsive type scale. The window does not change font size with viewport.

## 5. Spacing, layout, and grid

The app grid is `60px` top bar, `minmax(0, 1fr)` workspace, `30px` footer. The workspace is `248px`, flexible table, `400px` inspector. Gap in the top bar is 16px. Rail padding is 16px. Table cells are 10px horizontal, row height 44px.

Breakpoint: `max-width: 980px` switches to two columns (see ABP-FLOW). There is no other breakpoint.

Spacing used repeatedly: 6, 8, 10, 12, 14, 16, 18px. There is no 8pt token file beyond the CSS itself. The window minimum is 1100×700.

## 6. Shape and depth

| Token | Value | Use |
| --- | --- | --- |
| `--radius` | 12px | Analysis card |
| Inputs, buttons, status rows | 8px | `.btn`, `.status-item`, fields |
| Camelot badge | 6px | `.camelot` |
| Pills and chips | 99px | `.pill`, `.chip` |
| Play | 99px | `.play` |
| Modal | 16px | `.modal` |
| Drop overlay | 16px | `.drop` |
| Cover | 10px | `.cover` |
| Toast | 10px | `.toast` |
| `--shadow` | `0 24px 60px rgba(0,0,0,0.45)` | Modal and toast |
| Focus | 2px solid `--focus`, offset 2px | `:focus-visible` |
| Borders | 1px `--line` or `--line-strong` | Panels and inputs |

No stickers. No extra outline brand stroke.

## 7. Components

Code lives in `src/renderer/styles.css` and the TSX files named below.

| Component | Anatomy | States | File |
| --- | --- | --- | --- |
| Brand button | 32px mark, wordmark, subtitle | Default, focus-visible. Hover does not recolor. | `App.tsx` |
| Search field | Input, sr label | Default, focus | `App.tsx` |
| Button `.btn` | 8×12 padding, 8px radius | Default, hover (gold border), disabled 0.45 opacity | CSS |
| Primary `.btn-primary` | Gold fill, ink text, weight 600 | Hover `--gold-2`, disabled | CSS |
| Ghost `.btn-ghost` | No fill | Hover border | Footer |
| Danger `.btn-danger` | Coral text | Default | Remove |
| Status row | Dot, label, count | Default dim, hover and `.active` elevated | `Sidebar.tsx` |
| Table | Checkbox, title, BPM, key, genre, status, date | Hover `#191c22`, `.active` `--bg-active`, `.missing` faint text | `TrackTable.tsx` |
| Camelot badge | Mono code, gold border | Static | CSS `.camelot` |
| Analysis card | Tempo, key, buttons, waveform SVG | BPM lock disables half, double, input | `Inspector.tsx` |
| Cover well | Square, cover-size background | Empty faint label, or image | `Inspector.tsx` |
| Chip | Gold dim pill, remove | Default | Tags |
| Field | Label 12px dim, control | Error text `.error` in coral 12px | Inspector and dialogs |
| Modal | Scrim `rgba(0,0,0,0.62)`, panel `#14161b`, width min(520px, 100%), wide min(680px, 100%) | Open | `dialogs.tsx` |
| Toast | Gold border, max-width 360px, bottom right | Timed 4.2s | `App.tsx` |
| kbd | Mono, gold-2, 1px border, 2px bottom | Static | Shortcuts |

## 8. Iconography and illustration

The only illustration is the AwkBeats A (gold with a purple facet) and the analysis waveform, which is a gold SVG path of the beat's 160 peaks (stroke `#e4b15a` via `--gold`, width 1.4, no fill). Status uses CSS dots, not an icon font. No third-party icon set.

## 9. Motion

No entrance animation is defined. Hover and color changes are instant except where the browser defaults a transition; the reduced-motion rule sets `transition: none` and `animation: none` on everything. The drop overlay appears and disappears with state, not a timed animation. There is no celebration effect.

## 10. Imagery and media

Covers are JPEG. PNG can be read for size (`ImageSize.ts`) and embedded if the bytes are PNG (`ArtworkPayload` allows `image/jpeg` or `image/png`). The crop dialog always writes JPEG. Export sizes are 1500 and 3000. Display size in the inspector is the column width, square, `object-fit` via CSS `background-size: cover`.

Alt text: the cover is decorative next to the beat title, which is a heading. The empty cover says "No cover". There is no separate alt attribute because the well is a div with a background image.

Audio is played through the `beat://` URL. Formats: wav, mp3, aiff, flac.

## 11. Voice and copy

Tone: adult, brief, specific. Reading level: plain English, short sentences. Use: beat, library, tag, cover, half-time, double-time, Camelot, producer. Avoid: placeholder, lorem, TODO, "simply", "just", "unlock your", emoji, exclamation marks.

Example of the rule already applied: the empty state names the four formats and the two actions (drop or import). It does not say "Your journey starts here."

The ISRC example `US-AWK-26-00001` is a shape sample in the error string. It is not asserted to be a registered code.

## 12. Accessibility design rules

- Focus ring: 2px `#f3d7a4`, offset 2px, on `:focus-visible` only.
- Contrast minimum: WCAG AA (4.5:1) for text that is not large. The pairs in section 3 meet that after the faint-color change.
- Do not encode status by color alone. The label is printed.
- Keyboard path must cover import, search, analyze, write, and status. It does (ABP-FLOW).
- Reduced motion must remove animation. It does.
- Hit targets: table rows are 44px. The play control is 36px. Rail rows are shorter. Do not shrink the table row.

## 13. References and inspiration

No external product was copied. The layout (filters, table, inspector) is the usual pattern of a desktop music librarian. What was taken as a principle: dark chrome and a single accent so the Camelot badge and the primary button are the loudest elements. What was not copied: skeuomorphic decks, neon VU meters, purple-on-black "AI" gradients, Inter/system-stack as the only face.

IBM Plex was chosen because the OFL license is compatible with a commercial app and the mono companion matches the sans.

## 14. Do and don't

Do:

1. Show BPM with two decimal places.
2. Show the key name and the Camelot code together.
3. Keep gold for the brand, the primary button, the Camelot badge, and the waveform.
4. Write button labels as verbs the producer already uses ("Write tags to file", "Half-time").
5. Leave the audio file where the producer saved it.

Don't:

1. Don't put developer notes, TODOs, or lorem in the window.
2. Don't use a light theme for v1. `color-scheme: dark` is set.
3. Don't recolor status dots without updating this table.
4. Don't add a second accent that competes with gold.
5. Don't watermark the cover image unless the owner asks. The producer name is a tag, not a stamp.
6. Don't replace IBM Plex with a font whose license forbids embedding in a sold app.

## 15. Screens

The running window was captured during development. Images are pull-request artifacts, not committed PNGs:

- Library and analysis: Night Drive selected, BPM 140.25, F# minor, half-time and double-time controls visible.
- Metadata and artwork: cover well, title, producer, genre, mood, tags.
- Crop dialog: title "Crop cover", export size 3000×3000, Use cover.

Annotated notes: the tempo figure is `.tempo` at 40px mono. The Camelot code sits in `.camelot`. The primary action in the inspector is "Write tags to file". The crop primary action is "Use cover".

## 16. Glossary

| Term | Meaning |
| --- | --- |
| Gold | `#e4b15a`, the only brand accent. |
| Ink | `#1a1408`, text on gold buttons. |
| Faint | `#938d85`, metadata labels. |

## 17. Open questions

| ID | Question | Owner | Blocked |
| --- | --- | --- | --- |
| Q-004 | Resolved. The iOS icon and transparent logo are the marks in `build/`. | Awkward J | None |
| Q-010 | Is a wordmark lockup needed beyond the top bar? | Awkward J | Marketing site, not this app |

## 18. Changelog

| Date | Version | Change | Why |
| --- | --- | --- | --- |
| 2026-10-21 | 1.0 | Brief matched to `styles.css`, including the faint-color contrast fix. | Owner build brief. `#7e786e` failed AA for 11px labels. |
| 2026-10-21 | 1.1 | The mark is the iOS gold A. Transparent file in the window, opaque file on installers. | Owner supplied the logo. |

## 19. Sources

- `src/renderer/styles.css`, `main.tsx`, `App.tsx`, `Inspector.tsx`, `dialogs.tsx`.
- `build/icon.png`, `build/logo.png`, `build/icon.ico`, `build/icon.icns`, `build/icons/`.
- Contrast script run locally on 2026-10-21 (WCAG relative luminance).
- `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` license: SIL OFL 1.1.
