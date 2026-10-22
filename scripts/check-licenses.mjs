import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const forbidden = /\b(AGPL|GPL|LGPL|SSPL|EUPL|OSL|CPAL)\b/i;
const allowed = /(MIT|BSD|Apache|ISC|0BSD|Unlicense|CC0|OFL|BlueOak|Python|MPL|Artistic|Public Domain)/i;
const lines = execSync('npm ls --omit=dev --all --parseable', { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const problems = [];
let count = 0;
for (const dir of lines) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (pkg.name === 'awkbeats-prep-station') continue;
  count += 1;
  const license = formatLicense(pkg.license);
  if (!license) problems.push(`${pkg.name}@${pkg.version}: no license field`);
  else if (forbidden.test(license)) problems.push(`${pkg.name}@${pkg.version}: ${license}`);
  else if (!allowed.test(license)) problems.push(`${pkg.name}@${pkg.version}: unrecognized license ${license}`);
}

function formatLicense(license) {
  if (!license) return '';
  if (typeof license === 'string') return license;
  if (Array.isArray(license)) return license.map(formatLicense).join(' OR ');
  if (typeof license === 'object' && license.type) return String(license.type);
  return String(license);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Permissive licenses only (${count} production packages).`);
