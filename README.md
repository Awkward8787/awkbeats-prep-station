# AwkBeats Prep Station

Desktop catalog for preparing beats. It imports WAV, MP3, AIFF, and FLAC, measures tempo and musical key on the machine, and writes that metadata back into the audio files.

Producer: Awkward J. Brand site: [awkbeats.com](https://awkbeats.com).

The app is offline. The library is a JSON file in the operating system's app-data folder. Nothing is uploaded.

## What it does

- Import files or folders, including drag and drop. A `Beat.jpg` next to `Beat.wav` is picked up as cover art.
- Search, sort, and filter by key, BPM, genre, tag, date, and status (Idea, In progress, Ready, Leased, Sold).
- Measure BPM to 0.01 and musical key as both a name (`F# minor`) and a Camelot code (`11A`). Half-time and double-time stay relative to the detected tempo. Values can be typed and locked.
- Edit title, producer, genre, mood, tags, comments, copyright, optional ISRC, and date, then write them into ID3v2 (MP3, WAV, AIFF) or Vorbis comments (FLAC). WAV also gets a RIFF INFO list.
- Crop cover art to a square and export at 1500×1500 or 3000×3000 JPEG, then embed it.
- Batch analyze, batch edit, and export the catalog to CSV.
- Play a beat from the library. Keyboard shortcuts are listed in the app (Ctrl or ⌘ /).

## Develop

Node.js 22.

```bash
npm ci
npm test
npm run typecheck
npm run licenses
npm run dev
```

`npm run dev` starts Vite and Electron. `npm start` runs the last production build in `dist/`.

`AWKBEATS_USER_DATA` overrides the library directory. `VITE_DEV_SERVER_URL` is set by the dev script.

## Tests

`npm test` runs Vitest. Tempo and key tests generate clicks, noise bursts, soft pulses, and tonal loops with known answers and require the detector to land on them. Tag tests write and read MP3, WAV, AIFF, and FLAC, and check that a WAV's audio samples do not change. Do not loosen those assertions to make a change pass.

## Installers

Unsigned installers are built in GitHub Actions on every branch push (`.github/workflows/installers.yml`) and uploaded as workflow artifacts:

- macOS: `release/AwkBeats-Prep-Station-1.0.0-mac-arm64.dmg` and `…-mac-x64.dmg` (artifact `AwkBeats-Prep-Station-macOS`)
- Windows: `release/AwkBeats-Prep-Station-1.0.0-win-x64.exe` (artifact `AwkBeats-Prep-Station-Windows`)

Pushing a tag that matches `v*` runs `.github/workflows/release.yml`. It builds the same unsigned disk images (arm64 and x64) and the Windows NSIS installer, then attaches them to the GitHub Release for that tag. The notes are `.github/release-notes.md`. `npm run dist:mac` and `npm run dist:win` still pass `--publish never`, and `electron-builder.yml` keeps `publish: null`, so the builder itself does not create the Release.

Local equivalents, on the matching OS:

```bash
npm run dist:mac
npm run dist:win
```

The installers are unsigned. macOS needs a right-click, then Open. Windows SmartScreen needs More info, then Run anyway.

## Code signing and notarization

The owner has to supply these. They are not in the repo.

### Apple

1. An Apple Developer Program membership for the legal entity that will ship the app.
2. A **Developer ID Application** certificate, exported as a `.p12`.
3. Notarization credentials: an App Store Connect API key (preferred) or an Apple ID with an app-specific password, plus the Team ID.

GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `CSC_LINK` | Base64 of the Developer ID Application `.p12` |
| `CSC_KEY_PASSWORD` | Password for that `.p12` |
| `APPLE_API_KEY` | Base64 of the App Store Connect API key (`.p8`) |
| `APPLE_API_KEY_ID` | Key ID |
| `APPLE_API_ISSUER` | Issuer ID |
| `APPLE_TEAM_ID` | Team ID |

Then set `mac.identity` to the Developer ID name, `hardenedRuntime: true`, and `notarize: true` in `electron-builder.yml`. Remove `CSC_IDENTITY_AUTO_DISCOVERY=false` only on the signed job.

### Windows

An OV or EV code-signing certificate. EV is what SmartScreen trusts immediately.

| Secret | Purpose |
| --- | --- |
| `WIN_CSC_LINK` or `CSC_LINK` | Base64 of the `.pfx` |
| `WIN_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD` | Password for that `.pfx` |

`win.signAndEditExecutable` is already true. With no certificate and `CSC_IDENTITY_AUTO_DISCOVERY=false`, electron-builder builds an unsigned exe.

## Documentation

`docs/` has the product, technical, flow, design, data, and implementation documents. PDFs are in `docs/pdf/`.

## License

The application is proprietary. See LICENSE and THIRD_PARTY_NOTICES.md.
