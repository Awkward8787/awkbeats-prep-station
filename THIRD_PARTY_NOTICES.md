# Third-party notices

AwkBeats Prep Station (the application) is proprietary. See LICENSE.

Production dependencies, verified with `npm run licenses` against `npm ls --omit=dev --all --parseable` at version 1.0.0:

| Package | Version used | License |
| --- | --- | --- |
| music-metadata | 7.14.0 | MIT |
| node-id3 | 0.2.9 | MIT |
| react | 18.3.1 | MIT |
| react-dom | 18.3.1 | MIT |
| scheduler | (React dependency) | MIT |
| @fontsource/ibm-plex-sans | 5.2.x | SIL Open Font License 1.1 |
| @fontsource/ibm-plex-mono | 5.2.x | SIL Open Font License 1.1 |
| IBM Plex (upstream) | bundled via fontsource | SIL Open Font License 1.1 |

Transitive production packages are included in the license check. The check fails the build if it finds GPL, AGPL, LGPL, SSPL, EUPL, OSL, or CPAL.

Key and BPM detection are original TypeScript in `src/core/analysis`. They do not link essentia, aubio, or any other GPL or AGPL detector. The Krumhansl–Schmuckler probe-tone weights in `src/core/analysis/KeyDetector.ts` are published numbers from *Cognitive Foundations of Musical Pitch* (1990), not copied source code.

Dev tools (Electron, electron-builder, Vite, esbuild, TypeScript, Vitest) are used to build and test. They are not bundled as the application's analysis engine. Electron's Chromium decoder is used at runtime to decode MP3 and FLAC locally. Chromium's licenses ship with the Electron binary.

`flac` (command-line) was used once on a development machine to create `tests/fixtures/silence.flac`. The application does not call the `flac` binary.
