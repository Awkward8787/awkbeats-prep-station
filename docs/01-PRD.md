# Product requirements — AwkBeats Prep Station

## Document control

| Field | Value |
| --- | --- |
| Project | AwkBeats Prep Station |
| Document title | Product Requirements Document |
| Document ID | ABP-PRD |
| Version | 1.2 |
| Status | Final (as shipped) |
| Last updated | 2026-10-22 (UTC) |
| Author | Cursor Agent, for owner Awkward J |
| Repo | https://github.com/Awkward8787/awkbeats-prep-station |
| Branch | `cursor/awkbeats-prep-station-e2e2` |
| Commit SHA | f99d3c6a38ad256e123fa13b50e0f7660369bd61 |
| Live URL | None. This is a desktop app. Brand site: https://awkbeats.com |
| Operator | Awkward J (legal entity UNCONFIRMED) |

## Table of contents

1. Summary
2. Background and problem
3. Goals and non-goals
4. Success metrics
5. Audience and personas
6. User stories
7. Functional requirements
8. Non-functional requirements
9. Content requirements
10. Monetization
11. Scope by release
12. Assumptions and constraints
13. Risks
14. Stakeholders
15. Glossary
16. Open questions
17. Changelog
18. Sources

## 1. Summary

AwkBeats Prep Station is a local desktop application for any producer who prepares beats. The brand is AwkBeats. The producer name is a setting, not a name built into the app. It keeps a searchable library of WAV, MP3, AIFF, and FLAC files, measures each beat's tempo to 0.01 BPM and its musical key in both standard notation and Camelot code, and writes title, producer, genre, mood, tempo, key, tags, comments, copyright, optional ISRC, date, and cover art into the file's real tags. Version 1.0.0 ships as an unsigned macOS `.dmg` and a Windows `.exe`. Analysis and the catalog stay on the machine. Nothing in the app phones home.

## 2. Background and problem

Producers finish beats in a DAW and then lose track of key, tempo, status, and cover art across folders. Streaming stores and sample platforms want consistent tags (key, BPM, artwork at a large square size, ISRC when the beat is registered). Doing that by hand in a separate tag editor, a spreadsheet, and an image editor is slow and the numbers drift.

The owner's request, paraphrased from the build brief: a desktop app branded AwkBeats (awkbeats.com, producer Awkward J) to prepare and keep track of beats; import WAV, MP3, AIFF, and FLAC; analyze key and exact BPM locally; write real tags; attach square cover art with a 3000×3000 export; track status from idea through sold; export CSV; batch edit and batch analyze; ship macOS and Windows installers; avoid AGPL/GPL analysis libraries because the app may be sold.

Current alternatives the brief rejected: essentia.js and other GPL or AGPL detectors, and any workflow that uploads audio to a server. This version does not replace a DAW and does not sell beats itself.

## 3. Goals and non-goals

### Goals

1. One local library the producer can search, sort, and filter without opening a spreadsheet.
2. Tempo and key measured on the machine, accurate on steady reference material to 0.01 BPM, with half-time and double-time and a hand override that can be locked.
3. Tags written into the formats distributors actually read: ID3v2 for MP3, RIFF INFO plus ID3 for WAV, ID3 for AIFF, Vorbis comments for FLAC, with embedded cover art.
4. A dark AwkBeats interface that is usable from the keyboard.
5. Installers for macOS and Windows produced by GitHub Actions and stored as workflow artifacts. Unsigned is acceptable for this version.

### Non-goals

1. No user accounts, cloud library, or collaboration in v1.
2. No DAW editing, mixing, or stem export.
3. No beat store, checkout, or license PDF generator.
4. No Linux installer in v1. The app can run under Electron on Linux for development.
5. No image watermark burned into the cover. A text producer field is written as a custom tag. That is the shipped form of the optional watermark request.
6. No code signing or notarization until the owner supplies certificates (see ABP-PLAN).
7. No analytics, crash reporter, or auto-update server.

## 4. Success metrics

The app collects no analytics, by design (NFR-006). There is no traffic, conversion, or retention number to report, and none is invented here.

Proposed manual signals, not targets:

| Signal | How it is checked | Status |
| --- | --- | --- |
| Tempo on generated clicks, noise bursts, and soft pulses | `tests/bpm-key.test.ts` asserts 0.01 BPM | Shipped |
| All 24 keys on generated tones | Same file | Shipped |
| Tags round-trip on four formats | `tests/library-tags.test.ts` | Shipped |
| Both installers exist as CI artifacts | GitHub Actions workflow `Build installers` | Shipped as workflow; artifact proof is the Actions run for the shipping commit |
| A producer can finish import → analyze → write tags without a network | Manual run on the Electron window | Exercised in development on Linux with seeded beats |

## 5. Audience and personas

### Primary — Awkward J (working producer)

Role: beatmaker selling or leasing instrumentals. Technical comfort: high inside a DAW, impatient with tag editors. Context: studio desk, macOS or Windows, often offline. Needs: correct key and BPM, a cover that meets a 3000×3000 request, a status so a beat is not leased twice, a CSV for a catalog. Accessibility: full keyboard path, dark UI, no flashing motion. Age range: UNCONFIRMED.

### Secondary — another producer using the same tool

Same needs. Producer name starts empty and is saved in Settings. Artist name is a separate field on each beat and starts empty. The brand chrome says AwkBeats.

### Not a persona in v1

Buyers of beats, playlist curators, and label admins do not get an account. They receive the tagged file and, if the producer sends it, the CSV.

## 6. User stories

### US-001 Import

As a producer, I want to drop a folder of bounces on the window so that every WAV, MP3, AIFF, and FLAC becomes a library row.

- Given the library is open, when the producer drops files or a folder, or uses Import, then each new audio file is added once.
- Given a file path is already in the library, when it is imported again, then it is counted as a duplicate and not added twice.
- Given `Night Drive.jpg` sits beside `Night Drive.wav`, when the wav is imported, then that JPEG is stored as the beat's cover.

### US-002 Find a beat

As a producer, I want to filter by status, genre, key, tag, BPM range, and date so that I can see what is ready in F# minor around 140 BPM.

- Given filters are set, when no row matches, the table says "No beats match these filters."
- Given a column header is clicked, the table sorts by that column.

### US-003 Know the tempo and key

As a producer, I want each beat analyzed locally so that I see BPM to two decimals and a key like "F# minor" with Camelot "11A".

- Given a steady click track at 140.25 BPM, the detector returns 140.25.
- Given a tonal loop in F# minor, the detector returns `F# minor` and `11A`.
- Given the producer clicks Half-time, the working BPM becomes half of the detected BPM, not half of a previous half.
- Given BPM or key is locked, a later analysis does not replace it.

### US-004 Write the file

As a producer, I want Write tags to file to store title, producer, genre, mood, BPM, key, tags, comments, copyright, ISRC, date, and the cover inside the audio file.

- Given a valid ISRC or a blank ISRC, the write proceeds. A malformed ISRC shows "ISRC must be 12 characters, like US-AWK-26-00001, or left blank."
- Given the file is read-only, the toast says "Tags could not be written. The file may be open in another app or read-only."

### US-005 Cover art

As a producer, I want to crop a cover to a square and export at 3000×3000 so that a store's artwork rule is met.

- Given the source is smaller than 3000×3000 and 3000 is selected, the crop dialog says "This image is smaller than 3000×3000. Exporting at 3000 will upscale it."

### US-006 Catalog

As a producer, I want a status, notes, batch edits, and a CSV so that I can run the catalog without a second tool.

- Status values are idea, in progress, ready, leased, and sold.
- CSV includes the working BPM and key, the detected values, locks, and file path.

## 7. Functional requirements

| ID | Requirement | Priority | Status | Stories | Implementation |
| --- | --- | --- | --- | --- | --- |
| FR-001 | Import WAV, MP3, AIFF/AIF, FLAC from files, folders, or drag and drop. Skip dotfiles. Reject files over 2 GiB. | Must | Shipped | US-001 | `src/core/library/AudioFiles.ts`, `Importer.ts`, `src/renderer/App.tsx` |
| FR-002 | Skip a path that is already in the library. | Must | Shipped | US-001 | `Importer.importPaths`, `LibraryStore.findByPath` |
| FR-003 | Search, sort, and filter by producer, artist, key, BPM range, genre, tag, date, and status. | Must | Shipped | US-002 | `BeatQuery`, `Sidebar.tsx`, `TrackTable.tsx` |
| FR-004 | Detect musical key as a name and a Camelot code, offline. | Must | Shipped | US-003 | `KeyDetector.ts`, `Camelot.ts` |
| FR-005 | Detect BPM to 0.01, offline, with half-time and double-time. | Must | Shipped | US-003 | `BpmDetector.ts`, `BpmMath.ts` |
| FR-006 | Hand override and lock for BPM and key. Locks survive re-analysis. | Must | Shipped | US-003 | `LibraryStore.applyAnalysis`, `Inspector.tsx` |
| FR-007 | Edit title, producer name, artist name, genre, mood, tags, comment, copyright, ISRC, date, status, notes. | Must | Shipped | US-004, US-006 | `Inspector.tsx`, `BeatValidation` |
| FR-008 | Write those fields into ID3v2 (MP3), RIFF INFO + ID3 (WAV), ID3 (AIFF), Vorbis comments (FLAC). | Must | Shipped | US-004 | `TagWriter.ts` |
| FR-009 | Import, crop to square, export at 1500 or 3000, embed artwork. | Must | Shipped | US-005 | `SquareCrop.ts`, `dialogs.tsx` CropDialog, `TagWriter` |
| FR-010 | Optional producer custom tag (`PRODUCER`). No burned-in image watermark. | Could | Shipped as text tag | US-004 | `TagWriter.id3Tags`, Vorbis `PRODUCER` |
| FR-011 | Status per beat: idea, in_progress, ready, leased, sold. Notes field. | Must | Shipped | US-006 | `types.ts` `BEAT_STATUSES` |
| FR-012 | CSV catalog export. | Must | Shipped | US-006 | `CsvExport.ts` |
| FR-013 | Batch edit and batch analyze. | Must | Shipped | US-006 | `LibraryStore.batchUpdate`, `App.analyzeIds` |
| FR-014 | Playback of the selected beat. | Should | Shipped | US-002 | `beat://audio/<id>`, `Inspector.tsx` |
| FR-015 | Keyboard shortcuts for search, import, export, analyze, write, remove, status, playback. | Should | Shipped | US-002 | `App.tsx`, `dialogs.tsx` |
| FR-016 | Settings: producer name (saved locally, pre-fills new beats), copyright template with `{year}` and `{producer}`, default cover export size. | Should | Shipped | US-001 | `DEFAULT_SETTINGS` |
| FR-017 | Show the audio file in the OS folder. | Should | Shipped | US-004 | `beat:reveal` |
| FR-018 | Sidecar JPEG (`Beat.jpg` or `Beat.jpeg`) imported as cover. | Should | Shipped | US-001 | `Importer.sidecarJpeg` |
| FR-019 | Remove from library without deleting the audio file. | Must | Shipped | US-006 | `LibraryStore.remove` |
| FR-020 | Flag a row when the audio file is missing on disk. | Should | Shipped | US-002 | `Beat.missing` computed on read |

## 8. Non-functional requirements

| ID | Requirement | Status | Where |
| --- | --- | --- | --- |
| NFR-001 | Analysis and tagging libraries are MIT, BSD, Apache-2.0, or original code. No AGPL/GPL detector such as essentia.js. | Shipped | `scripts/check-licenses.mjs`, `src/core/analysis/` |
| NFR-002 | Tests assert BPM and key against generated references. Tests are not weakened to pass. | Shipped | `tests/bpm-key.test.ts` |
| NFR-003 | GitHub Actions builds a macOS dmg and a Windows exe and uploads them as artifacts. No GitHub Release. | Shipped | `.github/workflows/installers.yml`, `--publish never` |
| NFR-004 | Dark AwkBeats UI. No placeholder copy and no developer notes in the interface. | Shipped | `src/renderer/styles.css`, `UserMessage.ts` |
| NFR-005 | Renderer is sandboxed. Node is not exposed except through the preload bridge. | Shipped | `electron/main.ts` webPreferences |
| NFR-006 | No network calls except the user opening https://awkbeats.com from the brand control, and the dev server in development. | Shipped | `SITE` constant, CSP in `src/renderer/index.html` |
| NFR-007 | Keyboard access for the main tasks. Visible focus ring. | Shipped | `:focus-visible` in `styles.css` |
| NFR-008 | Body text contrast meets WCAG AAA on the background. Muted labels meet AA. | Shipped | `--text-faint: #938d85` (see ABP-DESIGN) |
| NFR-009 | Reduced motion disables transitions and animations. | Shipped | `@media (prefers-reduced-motion: reduce)` |
| NFR-010 | Library writes are atomic (temp file, then rename). | Shipped | `LibraryStore.save` |
| NFR-011 | English only in v1. | Shipped | UI copy |
| NFR-012 | Window 1440×920, minimum 1100×700. | Shipped | `BrowserWindow` in `electron/main.ts` |

Performance budget: the renderer JS bundle from the 1.0.0 Vite build is 188 KB (`dist/renderer/assets/index-*.js`) and the CSS is 20 KB, plus self-hosted IBM Plex subsets. Analysis is capped at the first 90 seconds (`TrackAnalyzer`). There is no page-load target because there is no web page.

Privacy: audio and the catalog stay in the user-data directory. No account, no cookie, no third-party script. COPPA, GDPR, and PCI are out of scope for v1 because the app does not collect customer data and does not take payment. If the owner later sells the installer, the storefront's privacy policy is a separate document (UNCONFIRMED, not in this repo).

Security: see ABP-TRD. The renderer cannot navigate to arbitrary URLs. `window.open` is denied.

Reliability: a failed file is reported in the import summary and does not abort the rest of the batch. Tag write failures are per file.

SEO: not applicable. There is no public HTML site in this repo.

Localization: English strings only. Dates are ISO `YYYY-MM-DD` sliced from the file mtime or an existing tag.

## 9. Content requirements

The interface is one window, not a website. There is no privacy page, terms page, or refund page inside the app. Legal copy for a future sale is an owner action (ABP-PLAN).

| Surface | Purpose | Key copy |
| --- | --- | --- |
| Window title | Identify the app | AwkBeats Prep Station |
| Brand control | Name and link | AWKBEATS / Prep Station. Opens https://awkbeats.com |
| Empty library | Tell the producer how to start | "No beats in the library yet" / "Drop WAV, MP3, AIFF, or FLAC files here, or import a folder." |
| No matches | Filter dead end | "No beats match these filters." |
| Missing file | File moved | "This file is missing from disk." |
| Analyze idle | Before analysis | "Analyze to measure tempo, key, and the waveform." |
| Tags written | Success | "Tags were written to the file." |
| Tags failed | Failure | "Tags could not be written. The file may be open in another app or read-only." |
| ISRC | Validation | "ISRC must be 12 characters, like US-AWK-26-00001, or left blank." |
| BPM | Validation | "BPM must be between 40 and 300." |
| Remove dialog | Confirm | "Remove from library" / "Remove the selected beats from the library? The audio files stay on disk." |
| Crop upscale | Warn | "This image is smaller than 3000×3000. Exporting at 3000 will upscale it." |
| Drop overlay | Drag feedback | "Drop audio to import" |
| Tag hint | Tags field | "Press Enter to add a tag." |
| Copyright help | Settings | "{year} is replaced when a beat is imported." |

Tone: short, studio-floor, no jokes, no "lorem", no TODO, no "click here". The example ISRC `US-AWK-26-00001` is a format sample, not a registered code.

## 10. Monetization

The build brief says the app may be sold. Version 1.0.0 has no price, no payment provider, no tax handling, and no refund flow. Who would receive funds is UNCONFIRMED because the legal entity is UNCONFIRMED. The in-app copyright template is `© {year} {producer}`. It is written only when a producer name is set, and it is not a statement of the application's sale terms.

Status of payments: not applicable in this build.

## 11. Scope by release

### v1.0.0 (this tree) — Shipped

Everything in the functional table marked Shipped: local library, analysis, tags, artwork, CSV, batch tools, unsigned installers, tests, docs.

### Next — Planned

- Signed and notarized macOS build, signed Windows build, after the owner supplies certificates.
- Owner decision on price and storefront, if the app is sold.
- Optional burned-in producer mark on artwork, only if the owner asks. It was a nice-to-have and was not built.

### Later — Planned, not committed

- Linux package.
- SQLite if the JSON catalog gets too large to rewrite on every edit.
- Waveform zoom and region analysis.
- Auto-update.

## 12. Assumptions and constraints

- The owner is the producer Awkward J, brand AwkBeats, site awkbeats.com. The installer icon is the iOS app icon (`build/icon.png`, gold A with a purple accent on black). The transparent file `build/logo.png` is the in-app mark. The earlier drawn AJ mark was removed.
- Budget, team size, and a launch date were not given.
- Hosting is the user's computer plus GitHub Actions for installers. There is no application server.
- Analysis must stay permissively licensed because the app may be sold.
- Installers in this version are unsigned.
- Node.js 22 is the CI runtime (`actions/setup-node` with `node-version: 22`).

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Tempo octave errors on music without a clear pulse | Medium | Producer trusts a wrong BPM | Half-time and double-time, manual override, lock, confidence shown. Tests cover clicks, noise, soft pulses, and one drum loop. |
| Relative major/minor confusion | Medium | Wrong Camelot | Tonic salience term in `KeyDetector`. Tests cover all 24 keys on tonic-emphasized tones. Real mixes can still be ambiguous; the override exists for that. |
| Unsigned installers blocked by Gatekeeper or SmartScreen | High | Owner cannot hand the file to a customer easily | Documented signing steps. Artifacts are still produced. |
| Tag write damages audio | Low | Lost bounce | WAV rewrite keeps non-INFO chunks and tests that samples are unchanged. Other formats use ID3 or Vorbis block edits. |
| JSON catalog corruption | Low | Library list lost | Atomic rename. Audio files are not inside the JSON. |
| Commercial sale of a GPL detector | High if essentia were used | License conflict | Original detector plus MIT tag libraries. CI license check. |

## 14. Stakeholders and approvals

| Role | Who | Signed off |
| --- | --- | --- |
| Owner / producer | Awkward J | UNCONFIRMED |
| Brand site | awkbeats.com | Referenced only. No claim that this app is published there. |
| Builder | Cursor Agent | This tree |
| Legal entity, Apple team, Windows certificate holder | UNCONFIRMED | Not signed off |

## 15. Glossary

| Term | Meaning |
| --- | --- |
| Beat | One audio file plus its library row. |
| Camelot | Key code used by DJs. `11A` is F# minor. `8B` is C major. Implemented in `Camelot.ts`. |
| Working BPM | `bpmOverride` if set, otherwise `bpmDetected * bpmScale`. `bpmScale` is 0.5, 1, or 2. |
| Lock | `bpmLocked` or `keyLocked`. Analysis will not replace a locked value. |
| ISRC | International Standard Recording Code, stored as 12 characters. |
| Prep Station | The product name of this app. |
| userData | Electron's per-user directory, overridable with `AWKBEATS_USER_DATA`. |

## 16. Open questions

| ID | Question | Owner | Blocked until answered |
| --- | --- | --- | --- |
| Q-001 | What legal entity holds the copyright and would receive payment? | Awkward J | Signing identity, sale terms |
| Q-002 | Is a proprietary "all rights reserved" license the one the owner wants? | Awkward J | LICENSE file |
| Q-003 | Does the owner have an ISRC registrant prefix to validate against, or is the 12-character shape enough? | Awkward J | Stricter ISRC check |
| Q-004 | Resolved. The owner supplied the iOS app icon and the transparent logo. They replace the drawn AJ mark. | Awkward J | None |
| Q-005 | Will the app be sold, and at what price, through which store? | Awkward J | Monetization. No price was provided. |
| Q-006 | Contact email for support? | Awkward J | Not shown in the app |

## 17. Changelog

| Date | Version | Change | Why |
| --- | --- | --- | --- |
| 2026-10-21 | 1.0 | Initial PRD reconciled to the shipped 1.0.0 tree. | Owner build brief. |
| 2026-10-21 | 1.1 | Installer and in-app marks are the iOS logo. `build/icon.svg` is gone. | Owner supplied `icon.png` and the transparent logo. |
| 2026-10-22 | 1.2 | Producer name and artist name are separate. The producer default is a saved setting and starts empty. | The app is for any producer. |

## 18. Sources

- Owner brief in the task that created this repo (Awkward8787/awkbeats-prep-station).
- `package.json` version 1.0.0, `LICENSE`, `README.md`.
- `src/core/library/types.ts`, `UserMessage.ts`, `BeatRules.ts`, `Importer.ts`, `AudioFiles.ts`.
- `src/core/analysis/BpmDetector.ts`, `KeyDetector.ts`, `BpmMath.ts`, `Camelot.ts`, `TrackAnalyzer.ts`.
- `src/renderer/App.tsx`, `styles.css`, `dialogs.tsx`.
- `.github/workflows/installers.yml`.
