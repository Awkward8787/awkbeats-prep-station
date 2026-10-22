# Design brief — AwkBeats Prep Station

## Document control

| Field | Value |
| --- | --- |
| Project | AwkBeats Prep Station |
| Document title | Design Brief |
| Document ID | ABP-DESIGN |
| Version | 1.3 |
| Status | Final (as shipped) |
| Last updated | 2026-10-22 (UTC) |
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

Name: AwkBeats. Product: Prep Station. The app is for any producer or artist. Site: https://awkbeats.com.

Tagline: none in the product. The top bar subtitle is "Prep Station".

The interface should feel like a studio tool: plum ground, quiet, gold used sparingly. BPM uses IBM Plex Sans with tabular figures. Whole tempos show as integers.

Personality, each as a contrast the UI should hold:

- Precise, not playful. A fractional BPM is `140.25`. A whole BPM is `86`, not `86.00`.
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

Clear space: keep at least a quarter of the mark's height empty around it in marketing. Do not recolor the gold or the purple of the logo file, do not stretch it, and do not put the opaque black square in the title bar. The title bar and empty states use the transparent file so the A sits on the plum window (`--plum-950`). The retired AJ waveform is not in the repo. "Powered by AwkBeats" appears once, as a 12px footer button, and once in the About box. It is not in the sidebar and not on the installer.

There is no Open Graph image and no favicon separate from the app icon. Not applicable for a desktop window.

## 3. Color

Tokens live in `src/core/brand/Theme.ts` and are applied to the document root before the first render. `src/renderer/styles.css` only references `var(--…)`. Surfaces are flat plum. Gold is the single accent. The logo facet `#701888` is `--logo-plum` and is decorative only: it is not text, not an icon color, and not a border. Ratios use the WCAG relative-luminance formula.

| Token | Hex | Role |
| --- | --- | --- |
| `--plum-950` | `#140b1f` | Window |
| `--plum-900` | `#1b1029` | Top bar, rail, inspector, footer |
| `--plum-850` | `#24163a` | Inputs, cards, secondary buttons |
| `--plum-800` | `#2f1d4a` | Pills and the play button |
| `--plum-hover` | `#291a40` | Row hover and checkbox-selected rows |
| `--plum-active` | `#3a2260` | Selected row, always with the gold marker |
| `--line` | `#3a2a52` | Decorative dividers only |
| `--line-control` | `#7d68a0` | Input, select, checkbox, and button borders |
| `--text` | `#f7f2fb` | Primary text |
| `--text-dim` | `#cdbfe0` | Secondary text |
| `--text-faint` | `#a896c2` | Labels, counts, hints |
| `--gold` | `#e4b15a` | Primary fill, Camelot border, waveform, selected marker |
| `--gold-hover` | `#f0c46e` | Primary button hover |
| `--gold-text` | `#f3d7a4` | Gold-colored text and the focus ring |
| `--gold-ink` | `#1f1405` | Text on gold fills |
| `--status-idea` | `#a896c2` | Idea |
| `--status-progress` | `#e4b15a` | In progress |
| `--status-ready` | `#8ee0b8` | Ready |
| `--status-leased` | `#9eb6f0` | Leased |
| `--status-sold` | `#f4a6c8` | Sold |
| `--danger-text` | `#f09a86` | Remove and errors |
| `--focus` | `#f3d7a4` | Focus ring |
| `--logo-plum` | `#701888` | Logo only |

| Pair | Ratio | WCAG |
| --- | --- | --- |
| `--text` on `--plum-950` / `--plum-900` / `--plum-850` / `--plum-active` | 17.36 / 16.52 / 15.23 / 12.07 | AAA |
| `--text-faint` on `--plum-active` | 4.95 | AA |
| `--gold` on `--plum-active` | 6.80 | AA |
| `--gold-text` on `--plum-active` | 9.55 | AAA |
| `--gold-ink` on `--gold` / `--gold-hover` | 9.25 / 11.05 | AAA |
| `--line-control` on `--plum-850` / `--plum-900` | 3.49 / 3.78 | AA for control boundaries |
| `--danger-text` on `--plum-900` | 8.39 | AAA |

Gold is limited to the logo, the one primary button in the top bar, the Camelot badge, the selected-row marker, the waveform played portion, the focus ring, and the In progress status. Write tags to file is the primary button inside the inspector. Do not put gold on every border, do not use gold text on a mid purple, and do not use white text on gold.

Status dots are 8px circles plus the status word. The word is always present. Section titles are 12px sentence case in `--text-dim`. Selection is a plum fill plus a 3px gold inset on the first cell. Fill alone is 1.37:1 against the rail and is not enough.

## 4. Typography

Families, self-hosted, SIL Open Font License 1.1. IBM Plex Sans 400, 500, and 600 are the UI face. Space Grotesk 600 is the wordmark and the inspector title only, for continuity with awkbeats.com. Monospace is only inside `kbd` (`ui-monospace`). Fallback: `'Segoe UI', sans-serif`.

| Level | Size | Line height | Tracking | Weight | Where |
| --- | --- | --- | --- | --- | --- |
| Caption | 12px | 1.4 | 0 | 600 | Section titles, table headers, footer |
| Meta | 13px | 1.4 | 0 | 400 | Title subline |
| Body | 14px | 1.4 | 0 | 400 | Controls and copy |
| Section | 16px | 1.4 | 0 | 600 | Inspector section titles, sentence case |
| Inspector title | 20px | 1.15 | 0 | 600 | Space Grotesk, `.inspector-head h3` |
| Tempo | 32px | 1.15 | 0 | 600 tabular | `.tempo` |
| Wordmark | 14px | 1.15 | 0.08em | 600 | Space Grotesk, AWKBEATS only |

Only the wordmark stays uppercase. Section titles and table headers are sentence case. No responsive type scale.

## 5. Spacing, layout, and grid

The app grid is a 60px top bar, a flexible workspace, and a 36px footer. At 1360px and wider the workspace is 248px, a flexible table, and a 380px inspector. At 1359px and below it is `216px minmax(0, 1fr) 340px`, and the genre column is hidden. The table is `table-layout: fixed`. Column widths are checkbox 40, BPM 72, Key 132, Genre 112, Status 120, Date 104. The title column takes the rest and ellipsizes both lines. There is no 980px breakpoint. The window minimum is 1100×700 and the default is 1440×920.

Spacing is 4, 8, 12, 16, 24, and 32. Eight between related controls, 16 inside panels, 24 between inspector sections, 32 around the empty state. The search field is at most 480px wide.

## 6. Shape and depth

| Token | Value | Use |
| --- | --- | --- |
| Badges and checkboxes | 6px and 4px | `.camelot`, checkbox |
| Controls | 8px | Inputs, buttons, play |
| Cards and dialogs | 12px | Analysis card, empty drop zone, modal, toast |
| Pills and chips | 99px | Status pills and tag chips only |
| `--shadow` | `0 16px 40px rgb(8 4 14 / 0.45)` | Dialogs and toasts only |
| Focus | 2px solid `--focus` | `:focus-visible`. Rows use a 2px inset outline. |
| Control borders | 1px `--line-control` | Inputs, selects, buttons, checkboxes |
| Dividers | 1px `--line` | Panel edges only |

No gradients, glow, glass, or gold on every hover border. No stickers.

## 7. Components

Code lives in `src/renderer/styles.css` and the TSX files named below.

| Component | Anatomy | States | File |
| --- | --- | --- | --- |
| Brand lockup | 32px mark, wordmark, subtitle | Not a link. The footer opens the site. | `App.tsx` |
| Search field | Icon, placeholder, shortcut hint | Max width 480px | `App.tsx` |
| Button `.btn` | 8×12 padding, 8px radius, `--line-control` border | Hover uses `--plum-hover`, not a gold border | CSS |
| Primary `.btn-primary` | Gold fill, `--gold-ink` text, weight 600 | Hover `--gold-hover` | Import beats, Write tags to file |
| Ghost `.btn-ghost` | Includes `.btn` so the border is explicit | Shortcuts | Footer |
| Danger `.btn-danger` | `--danger-text` outline | Remove from library. Cancel takes initial focus. | Remove |
| Status row | Dot, label, count | Active uses plum fill and a gold inset | `Sidebar.tsx` |
| Filters | Disclosure "Filters (n)", collapsed | Hidden when the library is empty | `Sidebar.tsx` |
| Table | `role="grid"`, roving tabindex | Active row is plum plus a gold marker on the first cell | `TrackTable.tsx` |
| Camelot badge | Code, gold border, gold text | Static | CSS `.camelot` |
| Tempo and key | 32px BPM, key once, ½× 1× 2×, lock | Difference line only when working differs from detected | `Inspector.tsx` |
| Key preview | 32px speaker button, separate AudioContext | Chord about 1.5s. Hold sustains the root. No glow. | `KeyPreview.tsx` |
| Cover | 120px dashed target when empty, square when set | Image drops stay on this target | `Inspector.tsx` |
| Inspector footer | Sticky | Write tags, Show in folder, Remove | `Inspector.tsx` |
| Modal | Scrim, plum panel, radius 12 | Initial focus, Tab trap, focus return, `aria-labelledby` | `dialogs.tsx` |
| Toast | Radius 12 | Success leaves after 4s. Errors stay until dismissed. | `App.tsx` |
| kbd | Mono, gold text, control border | One key per `kbd`. macOS uses ⌘, Windows uses Ctrl. | Shortcuts |

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

The layout (filters, table, inspector) is a desktop music librarian. The brand ground is plum, taken from the logo's purple and darkened so text passes WCAG AA. Gold stays the signature accent. What was not copied: gradients, glow, glass, gold text on a mid purple, white text on gold, and the logo purple used as a UI color. Purple-on-black gradients are still out. Flat plum surfaces are the product.

IBM Plex Sans and Space Grotesk are OFL and are bundled locally.

## 14. Do and don't

Do:

1. Show a whole BPM as an integer (`86`) and a fractional BPM to two places (`140.25`).
2. Show the key name and the Camelot code together, each value once.
3. Keep gold for the logo, the primary button, the Camelot badge, the selected-row marker, the waveform, the focus ring, and In progress.
4. Write button labels as verbs the producer already uses ("Write tags to file", "Import beats").
5. Leave the audio file where the producer saved it.
6. Ask for a producer name on first launch. Leave producer, artist, and copyright blank until one is set.

Don't:

1. Don't put developer notes, TODOs, or lorem in the window.
2. Don't use a light theme. `color-scheme: dark` is set.
3. Don't recolor status dots without updating this table.
4. Don't add a second accent, a gradient, a glow, or gold on every border.
5. Don't watermark the cover image. The producer name is a tag, not a stamp.
6. Don't use the logo purple `#701888` as text or a border.
7. Don't hardcode a person's name as the default producer or copyright.
8. Don't replace the bundled OFL faces with a font whose license forbids embedding.

## 15. Screens

The running window was captured during development. Images are pull-request artifacts, not committed PNGs:

- Library and analysis: Night Drive selected, BPM 140.25, F# minor, half-time and double-time controls visible.
- Metadata and artwork: cover well, title, producer, genre, mood, tags.
- Crop dialog: title "Crop cover", export size 3000×3000, Use cover.

Annotated notes: the tempo figure is `.tempo` at 32px, weight 600, tabular. The Camelot code sits in `.camelot`. The top-bar primary action is "Import beats". The inspector primary action is "Write tags to file". The crop primary action is "Use cover".

## 16. Glossary

| Term | Meaning |
| --- | --- |
| Gold | `#e4b15a`, the only brand accent. |
| Gold ink | `#1f1405`, text on gold buttons. |
| Faint | `#a896c2`, metadata labels. |
| Plum | The surface scale from `#140b1f` to `#3a2260`. |

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
| 2026-10-22 | 1.2 | Window surfaces moved off black toward the logo purple. | Superseded by 1.3. |
| 2026-10-22 | 1.3 | Plum scale and gold accent in `Theme.ts`. Sentence case. One footer credit. BPM integers. Key confidence under 0.45 asks for an ear check. | UI review. The app is for any producer, so no default name. |

## 19. Sources

- `src/renderer/styles.css`, `main.tsx`, `App.tsx`, `Inspector.tsx`, `dialogs.tsx`.
- `build/icon.png`, `build/logo.png`, `build/icon.ico`, `build/icon.icns`, `build/icons/`.
- Contrast script run locally on 2026-10-21 (WCAG relative luminance).
- `@fontsource/ibm-plex-sans` and `@fontsource/space-grotesk` license: SIL OFL 1.1.
