// Checks the localization files. Run with `npm run l10n:check` (also part of `npm test`).
//
// Errors (exit code 1):
//   - l10n/bundle.l10n.json is out of date with the vscode.l10n.t calls in src/ (run `npm run l10n:export`).
//   - a %key% used in package.json is missing from package.nls.json.
//   - a t('key') used in media/panel.js is missing from webviewStrings() in src/i18n.ts.
//   - a translation file is not valid JSON, has keys that do not exist in English,
//     or its placeholders ({0}, {1}...) differ from the English text.
// Warnings (do not fail): keys not yet translated. VS Code shows them in English,
// so a translation can be contributed incrementally.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => join(root, ...p);
let errors = 0;
const error = msg => { errors++; console.error(`✗ ${msg}`); };

function readJson(file) {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (err) {
		error(`${file}: invalid JSON (${err.message})`);
		return undefined;
	}
}

const placeholders = text => [...String(text).matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');

// 1. bundle.l10n.json must match the source code.
const tmp = mkdtempSync(join(tmpdir(), 'l10n-'));
try {
	execFileSync(process.execPath, [rel('node_modules/@vscode/l10n-dev/dist/cli.js'), 'export', '--outDir', tmp, rel('src')], { stdio: 'ignore' });
	const fresh = JSON.stringify(readJson(join(tmp, 'bundle.l10n.json')));
	if (fresh !== JSON.stringify(readJson(rel('l10n/bundle.l10n.json')))) {
		error('l10n/bundle.l10n.json is out of date. Run `npm run l10n:export`.');
	}
} finally {
	rmSync(tmp, { recursive: true, force: true });
}

// 2. Every %key% in package.json exists in package.nls.json.
const nls = readJson(rel('package.nls.json')) ?? {};
const pkgText = readFileSync(rel('package.json'), 'utf8');
for (const [, key] of pkgText.matchAll(/"%([^%"]+)%"/g)) {
	if (!(key in nls)) { error(`package.json uses %${key}% but package.nls.json does not define it.`); }
}

// 3. Every t('key') in the webview exists in webviewStrings().
const i18nSrc = readFileSync(rel('src/i18n.ts'), 'utf8');
const webviewKeys = new Set([...i18nSrc.matchAll(/^\s*(\w+): vscode\.l10n\.t\(/gm)].map(m => m[1]));
for (const [, key] of readFileSync(rel('media/panel.js'), 'utf8').matchAll(/\bt\('([^']+)'\)/g)) {
	if (!webviewKeys.has(key)) { error(`media/panel.js uses t('${key}') but webviewStrings() in src/i18n.ts does not define it.`); }
}

// 4. Translations.
function checkTranslations(base, dir, pattern) {
	const source = readJson(join(dir, base));
	if (!source) { return; }
	const total = Object.keys(source).length;
	for (const file of readdirSync(dir).filter(f => pattern.test(f)).sort()) {
		const lang = file.match(pattern)[1];
		const tr = readJson(join(dir, file));
		if (!tr) { continue; }
		for (const [key, value] of Object.entries(tr)) {
			const label = `${file}: "${key}"`;
			if (!(key in source)) { error(`${label} does not exist in ${base} (obsolete or misspelled key).`); continue; }
			const text = typeof value === 'object' && value !== null ? value.message : value;
			if (typeof text !== 'string') { error(`${label} must be a string.`); continue; }
			const expected = typeof source[key] === 'object' ? source[key].message : source[key];
			if (placeholders(text) !== placeholders(expected)) { error(`${label} placeholders {n} differ from the English text.`); }
		}
		const missing = Object.keys(source).filter(k => !(k in tr));
		const done = total - missing.length;
		console.log(`${missing.length ? '!' : '✓'} ${file} [${lang}]: ${done}/${total} translated`);
		for (const k of missing) { console.log(`    missing: ${k}`); }
	}
}
checkTranslations('package.nls.json', root, /^package\.nls\.([\w-]+)\.json$/);
checkTranslations('bundle.l10n.json', rel('l10n'), /^bundle\.l10n\.([\w-]+)\.json$/);

if (errors) {
	console.error(`\n${errors} localization error(s).`);
	process.exit(1);
}
