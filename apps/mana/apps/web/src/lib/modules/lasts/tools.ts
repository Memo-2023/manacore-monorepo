/**
 * Lasts tools — AI-accessible CRUD + inference for the lasts module.
 *
 * Propose:
 *   - create_last     — new last (suspected | confirmed)
 *   - confirm_last    — suspected → confirmed with reflection fields
 *   - reclaim_last    — confirmed → reclaimed
 *
 * Auto:
 *   - list_lasts      — filtered by status + category
 *   - suggest_lasts   — runs inference scan, writes survivors as suspected
 *                       with inferredFrom set; user reviews via /lasts/inbox
 */

import type { ModuleTool } from '$lib/data/tools/types';
import { lastsStore } from './stores/items.svelte';
import { lastTable } from './collections';
import { decryptRecords, VaultLockedError } from '$lib/data/crypto';
import { toLast } from './queries';
import type { LastCategory, LastConfidence, LastStatus, LocalLast, WouldReclaim } from './types';
import { MILESTONE_CATEGORIES } from '$lib/data/milestones/categories';

const STATUSES: readonly LastStatus[] = ['suspected', 'confirmed', 'reclaimed'];
const CONFIDENCES: readonly LastConfidence[] = ['probably', 'likely', 'certain'];
const WOULD_RECLAIM: readonly WouldReclaim[] = ['no', 'maybe', 'yes'];

function asCategory(raw: unknown, fallback: LastCategory = 'other'): LastCategory {
	if (typeof raw !== 'string') return fallback;
	return (MILESTONE_CATEGORIES as readonly string[]).includes(raw)
		? (raw as LastCategory)
		: fallback;
}

function asEnum<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
	if (typeof raw !== 'string') return undefined;
	return (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

function asTrimmedString(raw: unknown): string {
	return typeof raw === 'string' ? raw.trim() : '';
}

export const lastsTools: ModuleTool[] = [
	{
		name: 'create_last',
		module: 'lasts',
		description: 'Erstellt einen neuen Last (suspected oder confirmed)',
		parameters: [
			{ name: 'title', type: 'string', description: 'Titel', required: true },
			{ name: 'category', type: 'string', description: 'Kategorie', required: false },
			{ name: 'status', type: 'string', description: 'suspected | confirmed', required: false },
			{ name: 'date', type: 'string', description: 'YYYY-MM-DD', required: false },
			{
				name: 'confidence',
				type: 'string',
				description: 'probably | likely | certain',
				required: false,
			},
			{ name: 'meaning', type: 'string', description: 'Bedeutung', required: false },
			{ name: 'note', type: 'string', description: 'Notiz', required: false },
		],
		async execute(params) {
			const title = asTrimmedString(params.title);
			if (!title) return { success: false, message: 'title darf nicht leer sein' };

			const category = asCategory(params.category);
			const status = asEnum<LastStatus>(params.status, ['suspected', 'confirmed']) ?? 'suspected';
			const meaning = asTrimmedString(params.meaning) || undefined;
			const note = asTrimmedString(params.note) || undefined;
			const date = typeof params.date === 'string' ? params.date.slice(0, 10) : undefined;

			if (status === 'confirmed') {
				const last = await lastsStore.createConfirmed({
					title,
					category,
					date,
					meaning: meaning ?? null,
					note: note ?? null,
				});
				return {
					success: true,
					data: { lastId: last.id, status: last.status, title: last.title },
					message: `Bestätigter Last: "${title}"`,
				};
			}

			const confidence = asEnum<LastConfidence>(params.confidence, CONFIDENCES);
			const last = await lastsStore.createSuspected({
				title,
				category,
				confidence: confidence ?? null,
				date: date ?? null,
				meaning: meaning ?? null,
				note: note ?? null,
			});
			return {
				success: true,
				data: { lastId: last.id, status: last.status, title: last.title },
				message: `Vermuteter Last: "${title}"`,
			};
		},
	},

	{
		name: 'confirm_last',
		module: 'lasts',
		description: 'Bewegt einen Last von suspected auf confirmed mit Reflexion',
		parameters: [
			{ name: 'lastId', type: 'string', description: 'ID', required: true },
			{ name: 'date', type: 'string', description: 'YYYY-MM-DD', required: false },
			{ name: 'meaning', type: 'string', description: 'Bedeutung', required: false },
			{
				name: 'whatIKnewThen',
				type: 'string',
				description: 'Was du damals nicht wusstest',
				required: false,
			},
			{
				name: 'whatIKnowNow',
				type: 'string',
				description: 'Was du heute siehst',
				required: false,
			},
			{
				name: 'tenderness',
				type: 'number',
				description: '1-5',
				required: false,
			},
			{
				name: 'wouldReclaim',
				type: 'string',
				description: 'no | maybe | yes',
				required: false,
			},
		],
		async execute(params) {
			const lastId = asTrimmedString(params.lastId);
			if (!lastId) return { success: false, message: 'lastId darf nicht leer sein' };

			const existing = await lastTable.get(lastId);
			if (!existing || existing.deletedAt) {
				return { success: false, message: `Last ${lastId} nicht gefunden` };
			}

			const tendernessRaw = params.tenderness;
			let tenderness: number | null = null;
			if (typeof tendernessRaw === 'number') {
				if (tendernessRaw < 1 || tendernessRaw > 5) {
					return { success: false, message: 'tenderness muss zwischen 1 und 5 liegen' };
				}
				tenderness = Math.round(tendernessRaw);
			}

			await lastsStore.confirmLast(lastId, {
				date: typeof params.date === 'string' ? params.date.slice(0, 10) : undefined,
				meaning: asTrimmedString(params.meaning) || null,
				whatIKnewThen: asTrimmedString(params.whatIKnewThen) || null,
				whatIKnowNow: asTrimmedString(params.whatIKnowNow) || null,
				tenderness,
				wouldReclaim: asEnum<WouldReclaim>(params.wouldReclaim, WOULD_RECLAIM) ?? null,
			});
			return {
				success: true,
				data: { lastId, status: 'confirmed' },
				message: 'Last bestätigt',
			};
		},
	},

	{
		name: 'reclaim_last',
		module: 'lasts',
		description: 'Markiert einen Last als aufgehoben (es ist wieder passiert)',
		parameters: [
			{ name: 'lastId', type: 'string', description: 'ID', required: true },
			{
				name: 'reclaimedNote',
				type: 'string',
				description: 'Was ist wieder passiert',
				required: false,
			},
		],
		async execute(params) {
			const lastId = asTrimmedString(params.lastId);
			if (!lastId) return { success: false, message: 'lastId darf nicht leer sein' };

			const existing = await lastTable.get(lastId);
			if (!existing || existing.deletedAt) {
				return { success: false, message: `Last ${lastId} nicht gefunden` };
			}
			if (existing.status !== 'confirmed') {
				return {
					success: false,
					message: `Nur confirmed Lasts können aufgehoben werden (aktuell: ${existing.status})`,
				};
			}

			await lastsStore.reclaimLast(lastId, asTrimmedString(params.reclaimedNote) || null);
			return {
				success: true,
				data: { lastId, status: 'reclaimed' },
				message: 'Last aufgehoben',
			};
		},
	},

	{
		name: 'list_lasts',
		module: 'lasts',
		description: 'Listet Lasts (filterbar nach status + category)',
		parameters: [
			{ name: 'status', type: 'string', description: 'Status-Filter', required: false },
			{ name: 'category', type: 'string', description: 'Kategorie-Filter', required: false },
			{ name: 'limit', type: 'number', description: 'Max (Standard 30)', required: false },
		],
		async execute(params) {
			const statusFilter = asEnum<LastStatus>(params.status, STATUSES);
			const categoryFilter = asEnum<LastCategory>(
				params.category,
				MILESTONE_CATEGORIES as readonly LastCategory[]
			);
			const limit = Math.min(Math.max(Number(params.limit) || 30, 1), 100);

			try {
				const all = await lastTable.toArray();
				const visible = all.filter((l) => !l.deletedAt && !l.isArchived);
				const decrypted = await decryptRecords<LocalLast>('lasts', visible);
				const rows = decrypted
					.map(toLast)
					.filter((l) => (statusFilter ? l.status === statusFilter : true))
					.filter((l) => (categoryFilter ? l.category === categoryFilter : true))
					.sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt))
					.slice(0, limit)
					.map((l) => ({
						id: l.id,
						title: l.title,
						status: l.status,
						category: l.category,
						date: l.date,
						tenderness: l.tenderness,
						inferred: l.inferredFrom != null,
					}));

				return {
					success: true,
					data: { lasts: rows, total: rows.length },
					message: `${rows.length} Last(s) gelistet`,
				};
			} catch (err) {
				if (err instanceof VaultLockedError) {
					return {
						success: false,
						message: 'Vault ist gesperrt — Lasts können nicht entschlüsselt werden',
					};
				}
				throw err;
			}
		},
	},

	{
		name: 'suggest_lasts',
		module: 'lasts',
		description:
			'Scannt places/contacts auf Frequenz-Drops und schreibt Vorschläge als suspected Lasts in die Inbox',
		parameters: [],
		async execute() {
			const result = await lastsStore.suggestLasts();
			return {
				success: true,
				data: {
					written: result.written,
					cooldownFiltered: result.cooldownFiltered,
					existingFiltered: result.existingFiltered,
					candidatesProduced: result.candidatesProduced,
				},
				message: `${result.written} neue Vorschläge in der Inbox (${result.cooldownFiltered} im Cooldown übersprungen, ${result.existingFiltered} schon bekannt).`,
			};
		},
	},
];
