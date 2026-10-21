#!/usr/bin/env node
/**
 * Build docs/pdf from docs/*.md.
 * Mermaid blocks are rendered to SVG with the local mermaid bundle and headless Chrome.
 * Source markdown is not modified.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(root, 'docs');
const assetDir = path.join(docsDir, 'assets', 'diagrams');
const pdfDir = path.join(docsDir, 'pdf');
const mermaidJs = path.join(root, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
const chrome = '/usr/bin/google-chrome';

const files = [
  ['01-PRD.md', 'ABP-PRD', 'Product Requirements'],
  ['02-TRD.md', 'ABP-TRD', 'Technical Requirements'],
  ['03-App-Flow.md', 'ABP-FLOW', 'App Flow'],
  ['04-Design-Brief.md', 'ABP-DESIGN', 'Design Brief'],
  ['05-Backend-Schema.md', 'ABP-DATA', 'Backend and Data Schema'],
  ['06-Implementation-Plan.md', 'ABP-PLAN', 'Implementation Plan'],
];

fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(pdfDir, { recursive: true });

const marked = new Marked({ gfm: true, breaks: false });

function extractDiagrams(markdown, docId) {
  const diagrams = [];
  const replaced = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (_all, body) => {
    const index = diagrams.length + 1;
    const id = `${docId.toLowerCase()}-${index}`;
    diagrams.push({ id, body: body.trim() });
    const src = `file://${path.join(assetDir, `${id}.svg`)}`;
    return `<figure class="diagram"><img src="${src}" alt="" /></figure>`;
  });
  return { markdown: replaced, diagrams };
}

function renderDiagrams(diagrams) {
  if (!diagrams.length) return;
  const blocks = diagrams
    .map(
      (diagram) =>
        `<section id="${diagram.id}"><pre class="mermaid">\n${diagram.body}\n</pre></section>`,
    )
    .join('\n');
  const htmlPath = '/tmp/awkbeats-mermaid.html';
  const html = `<!doctype html>
<meta charset="utf-8">
<style>body{background:#fff;margin:0} section{padding:12px}</style>
<script src="file://${mermaidJs}"></script>
<script>
mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose", fontFamily: "Liberation Sans, sans-serif" });
</script>
${blocks}
`;
  fs.writeFileSync(htmlPath, html);
  let dom = '';
  try {
    const stdout = execFileSync(
      'timeout',
      [
        '45',
        chrome,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--no-first-run',
        `--user-data-dir=/tmp/chrome-mermaid-${process.pid}`,
        '--virtual-time-budget=15000',
        '--dump-dom',
        htmlPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 55000, maxBuffer: 32 * 1024 * 1024 },
    );
    dom = stdout.toString();
  } catch (error) {
    dom = error.stdout ? error.stdout.toString() : '';
    if (!dom.includes('<svg')) {
      const stderr = error.stderr ? error.stderr.toString() : String(error);
      throw new Error(`Mermaid render failed: ${stderr.slice(0, 800)}`);
    }
  }
  for (const diagram of diagrams) {
    const marker = `id="${diagram.id}"`;
    const start = dom.indexOf(marker);
    if (start < 0) throw new Error(`Missing section ${diagram.id}`);
    const slice = dom.slice(start);
    const svgStart = slice.indexOf('<svg');
    const svgEnd = slice.indexOf('</svg>');
    if (svgStart < 0 || svgEnd < 0) throw new Error(`No SVG for ${diagram.id}`);
    let svg = slice.slice(svgStart, svgEnd + 6);
    svg = svg.replace(/\sstyle="max-width:[^"]*"/, '');
    fs.writeFileSync(path.join(assetDir, `${diagram.id}.svg`), svg);
  }
}

function screenshotHtml() {
  const shots = [
    ['/opt/cursor/artifacts/library_analysis.png', 'Library and analysis. Night Drive selected, BPM and key visible.'],
    ['/opt/cursor/artifacts/metadata_artwork.png', 'Metadata and artwork editor.'],
    ['/opt/cursor/artifacts/crop_3000.png', 'Crop cover dialog with a 3000 export size.'],
  ];
  return shots
    .filter(([file]) => fs.existsSync(file))
    .map(
      ([file, caption]) =>
        `<figure class="shot"><img src="file://${file}" alt="${caption}" /><figcaption>${caption}</figcaption></figure>`,
    )
    .join('\n');
}

function pageCss(docId, title) {
  return `
  @page {
    size: A4;
    margin: 16mm 12mm 16mm 12mm;
    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-family: "Liberation Sans", sans-serif;
      font-size: 8.5pt;
      color: #666;
    }
  }
  * { box-sizing: border-box; }
  html { font-family: "Liberation Serif", "Times New Roman", serif; font-size: 11pt; color: #1c1b19; }
  body { margin: 0; line-height: 1.45; }
  h1 { font-family: "Liberation Sans", sans-serif; font-size: 20pt; line-height: 1.2; margin: 0 0 12px; page-break-before: always; }
  .running + h1, .cover h1 { page-break-before: avoid; }
  h2 { font-family: "Liberation Sans", sans-serif; font-size: 14pt; margin: 18px 0 6px; page-break-after: avoid; }
  h3 { font-family: "Liberation Sans", sans-serif; font-size: 12pt; margin: 14px 0 4px; page-break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 8pt; page-break-inside: auto; table-layout: fixed; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #c8c2b6; padding: 3px 4px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
  th { background: #f3efe4; font-family: "Liberation Sans", sans-serif; }
  code { font-family: "Liberation Mono", monospace; font-size: 8.5pt; }
  pre { white-space: pre-wrap; background: #f6f4ef; border: 1px solid #e2ddd2; padding: 8px; font-size: 8pt; }
  a { color: #6b4e16; }
  img { max-width: 100%; height: auto; }
  figure { margin: 10px 0 14px; page-break-inside: avoid; }
  figcaption, p.caption { font-family: "Liberation Sans", sans-serif; font-size: 9pt; color: #444; margin-top: 4px; }
  .running { font-family: "Liberation Sans", sans-serif; font-size: 8.5pt; color: #666; border-bottom: 1px solid #e2ddd2; padding-bottom: 4px; margin-bottom: 12px; }
  .cover { page-break-after: always; min-height: 240mm; }
  .cover h1 { font-size: 28pt; page-break-before: avoid; }
  ul.toc { list-style: none; padding: 0; }
  ul.toc li { margin: 4px 0; }
`;
}

function htmlDocument(docId, title, body, extra = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${pageCss(docId, title)}</style>
</head>
<body>
<div class="running">AwkBeats Prep Station · ${docId} · ${title}</div>
${extra}
${body}
</body>
</html>`;
}

function printPdf(html, pdfPath) {
  const htmlPath = `/tmp/${path.basename(pdfPath)}.html`;
  fs.writeFileSync(htmlPath, html);
  try {
    execFileSync(
      'timeout',
      [
        '40',
        chrome,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--no-first-run',
        `--user-data-dir=/tmp/chrome-print-${path.basename(pdfPath)}`,
        '--virtual-time-budget=4000',
        `--print-to-pdf=${pdfPath}`,
        '--no-pdf-header-footer',
        htmlPath,
      ],
      { stdio: 'pipe', timeout: 50000 },
    );
  } catch (error) {
    if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size < 1000) {
      throw new Error(`PDF failed for ${pdfPath}: ${error.stderr ? error.stderr.toString().slice(0, 500) : error}`);
    }
  }
}

const rendered = [];
const allDiagrams = [];
for (const [file, docId, title] of files) {
  const raw = fs.readFileSync(path.join(docsDir, file), 'utf8');
  const { markdown, diagrams } = extractDiagrams(raw, docId);
  diagrams.forEach((diagram) => allDiagrams.push(diagram));
  let body = marked.parse(markdown);
  body = body.replace(/<p>Caption:/g, '<p class="caption">');
  if (file === '03-App-Flow.md' || file === '04-Design-Brief.md') {
    body += screenshotHtml();
  }
  rendered.push({ file, docId, title, body });
}

renderDiagrams(allDiagrams);

for (const item of rendered) {
  const html = htmlDocument(item.docId, item.title, item.body);
  const pdf = path.join(pdfDir, item.file.replace(/\.md$/, '.pdf'));
  printPdf(html, pdf);
  console.log('wrote', pdf);
}

const cover = `
<section class="cover">
  <p class="running">AwkBeats Prep Station</p>
  <h1>Project documentation</h1>
  <p>AwkBeats Prep Station, version 1.0.0.</p>
  <p>Operator: Awkward J (legal entity UNCONFIRMED). Brand site: https://awkbeats.com. There is no hosted app URL.</p>
  <p>Repository: https://github.com/Awkward8787/awkbeats-prep-station</p>
  <p>Branch: cursor/awkbeats-prep-station-e2e2</p>
  <p>Date: 2026-10-21 (UTC). Status: Final (as shipped).</p>
  <h2>Contents</h2>
  <ul class="toc">
    ${files.map(([, id, title]) => `<li>${id} — ${title}</li>`).join('')}
  </ul>
</section>
<section>
  <h1>Combined glossary</h1>
  <p>Beat: one audio file plus its library row. Camelot: DJ key code, for example 11A is F# minor. Working BPM: bpmOverride if set, otherwise bpmDetected times bpmScale (0.5, 1, or 2). Lock: bpmLocked or keyLocked, which analysis will not overwrite. ISRC: 12-character recording code. userData: Electron's per-user directory, overridable with AWKBEATS_USER_DATA. PrepApi: the preload bridge on window.prep.</p>
  <h1>Combined open questions</h1>
  <table>
    <thead><tr><th>ID</th><th>Question</th><th>Owner</th></tr></thead>
    <tbody>
      <tr><td>Q-001</td><td>Legal entity for copyright and Apple Developer ID</td><td>Awkward J</td></tr>
      <tr><td>Q-002</td><td>Keep the proprietary all-rights-reserved license?</td><td>Awkward J</td></tr>
      <tr><td>Q-003</td><td>ISRC registrant prefix, or is the 12-character check enough?</td><td>Awkward J</td></tr>
      <tr><td>Q-004</td><td>Approve the drawn AJ mark</td><td>Awkward J</td></tr>
      <tr><td>Q-005</td><td>Will the app be sold, at what price, through which store? No price was provided.</td><td>Awkward J</td></tr>
      <tr><td>Q-006</td><td>Support email</td><td>Awkward J</td></tr>
      <tr><td>Q-007</td><td>Windows certificate: OV or EV</td><td>Awkward J</td></tr>
      <tr><td>Q-008</td><td>Minimum macOS string for Electron 33.4.11</td><td>Awkward J</td></tr>
      <tr><td>Q-009</td><td>Should remove ever delete the audio file? v1 does not.</td><td>Awkward J</td></tr>
      <tr><td>Q-010</td><td>Wordmark lockup beyond the top bar</td><td>Awkward J</td></tr>
      <tr><td>Q-011</td><td>Should catalog notes also be written into the audio comment?</td><td>Awkward J</td></tr>
      <tr><td>Q-012</td><td>Relink a beat when its file moves?</td><td>Awkward J</td></tr>
    </tbody>
  </table>
</section>
`;

const combinedBody = cover + rendered.map((item) => item.body).join('\n');
printPdf(
  htmlDocument('ABP-DOCS', 'Project documentation', combinedBody),
  path.join(pdfDir, 'Project-Docs-AwkBeats-Prep-Station.pdf'),
);
console.log('combined written');
