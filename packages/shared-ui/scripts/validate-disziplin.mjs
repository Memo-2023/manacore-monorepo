#!/usr/bin/env node
/**
 * shared-ui-2 Disziplin-Validator
 *
 * Prüft jede .svelte-Datei in src/ gegen die Konvention aus README.md:
 *
 * 1. Keine Tailwind-Color-Utility-Klassen in `class=`
 *    (`bg-card`, `text-foreground`, `border-primary`, ...)
 * 2. Keine bare `var(--color-X)` — nur `hsl(var(--color-X))`
 * 3. Tokens nur aus der 12-Token-Allowlist
 * 4. Keine Hex-Farben (außer in `--brand-*`-Definitionen oder Kommentaren)
 *
 * Keine externen Dependencies. Pure Node.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

const ALLOWED_TOKENS = new Set([
	'background',
	'foreground',
	'surface',
	'surface-hover',
	'muted',
	'muted-foreground',
	'border',
	'primary',
	'primary-foreground',
	'error',
	'success',
	'warning',
]);

// Tailwind-Color-Utility-Patterns (in class= attribute or Tailwind arbitrary values)
const FORBIDDEN_TAILWIND_COLOR_PATTERNS = [
	/\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|placeholder|caret|accent|decoration|divide|shadow)-(?:foreground|background|surface|surface-hover|muted|muted-foreground|border|primary|primary-foreground|error|success|warning|card|popover|secondary|accent|input|ring|destructive)\b/g,
];

function walkSvelteFiles(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		const s = statSync(p);
		if (s.isDirectory()) out.push(...walkSvelteFiles(p));
		else if (entry.endsWith('.svelte')) out.push(p);
	}
	return out;
}

function checkFile(file) {
	const text = readFileSync(file, 'utf8');
	const errors = [];

	// Split into class attributes and style blocks for pattern-specific checks
	const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/g;
	const styleBlocks = [];
	let m;
	while ((m = styleBlockRe.exec(text)) !== null) {
		styleBlocks.push({ start: m.index, end: m.index + m[0].length, content: m[1] });
	}

	// Check 1: bare var(--color-X) without hsl-wrap (anywhere in file)
	const varColorRe = /var\(--color-([a-z-]+)\)/g;
	let varM;
	while ((varM = varColorRe.exec(text)) !== null) {
		const idx = varM.index;
		const before = text.slice(Math.max(0, idx - 4), idx);
		// Allow bare var() inside --brand-* definitions and comments — coarse heuristic
		const lineStart = text.lastIndexOf('\n', idx) + 1;
		const lineEnd = text.indexOf('\n', idx);
		const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
		if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
		if (before !== 'hsl(') {
			const lineNo = text.slice(0, idx).split('\n').length;
			errors.push(`  L${lineNo}: bare var(--color-${varM[1]}) — wrap with hsl()`);
		}
	}

	// Check 2: forbidden Tailwind-Color-Utility-Klassen (in class= attributes)
	const classAttrRe = /\bclass(?:Name)?\s*=\s*"([^"]*)"|\bclass(?:Name)?\s*=\s*'([^']*)'/g;
	let cm;
	while ((cm = classAttrRe.exec(text)) !== null) {
		const classValue = cm[1] || cm[2] || '';
		for (const pattern of FORBIDDEN_TAILWIND_COLOR_PATTERNS) {
			pattern.lastIndex = 0;
			let pm;
			while ((pm = pattern.exec(classValue)) !== null) {
				const lineNo = text.slice(0, cm.index).split('\n').length;
				errors.push(`  L${lineNo}: Tailwind-Color-Klasse "${pm[0]}" — Styles in <style>-Block`);
			}
		}
	}

	// Check 3: tokens outside the 12-set in --color-* definitions or var() refs
	const tokenRefRe = /--color-([a-z-]+)/g;
	let tm;
	const seenViolations = new Set();
	while ((tm = tokenRefRe.exec(text)) !== null) {
		const token = tm[1];
		if (!ALLOWED_TOKENS.has(token)) {
			const key = `${token}@${tm.index}`;
			if (seenViolations.has(key)) continue;
			seenViolations.add(key);
			const lineNo = text.slice(0, tm.index).split('\n').length;
			errors.push(`  L${lineNo}: --color-${token} not in 12-token allowlist`);
		}
	}

	// Check 4: hex colors in <style>-Blocks (excluding --brand-* lines)
	for (const block of styleBlocks) {
		const blockLines = block.content.split('\n');
		blockLines.forEach((line, i) => {
			// allow --brand-* hex declarations
			if (/^\s*--brand-/.test(line)) return;
			// allow url(...data:...) literals (not actual color values)
			if (/data:image/.test(line)) return;
			// allow comments
			if (/^\s*\/\*/.test(line) || /^\s*\*/.test(line)) return;
			const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
			let hm;
			while ((hm = hexRe.exec(line)) !== null) {
				// Compute rough line number in original file
				const blockLineStart = text.slice(0, block.start).split('\n').length;
				const lineNo = blockLineStart + i;
				errors.push(`  L${lineNo}: hex color "${hm[0]}" — use 12 tokens or --brand-*`);
			}
		});
	}

	return errors;
}

let totalErrors = 0;
const files = walkSvelteFiles(SRC);
console.log(`Validating ${files.length} components...\n`);

for (const file of files) {
	const rel = relative(SRC, file);
	const errors = checkFile(file);
	if (errors.length === 0) {
		console.log(`  ✓ ${rel}`);
	} else {
		console.log(`  ✗ ${rel}`);
		errors.forEach((e) => console.log(e));
		totalErrors += errors.length;
	}
}

console.log();
if (totalErrors > 0) {
	console.error(`FAIL: ${totalErrors} disziplin violation(s)`);
	process.exit(1);
}
console.log(
	'PASS: all components pass disziplin check (12 tokens, hsl-wrap, no Tailwind color classes, no bare hex)'
);
