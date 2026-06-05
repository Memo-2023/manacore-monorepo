/**
 * Plaintext allowlist — Dexie tables that are intentionally NOT encrypted.
 *
 * Counterpart to ENCRYPTION_REGISTRY in crypto/registry.ts. The audit script
 * (`scripts/audit-crypto-registry.mjs`, wired as `pnpm run check:crypto`)
 * fails if a Dexie table is in neither list.
 *
 * Why a separate file: adding a table here is a conscious security decision
 * ("this genuinely holds no user-sensitive data") and should be reviewable
 * as its own diff, not buried inside database.ts.
 *
 * Auto-seeded from current state on 2026-04-20 — every entry below was
 * introduced before the audit script existed. The `// TODO: audit` markers
 * are an invitation to review each one: does this table really hold nothing
 * that would embarrass the user if it leaked? If not, move it to the
 * encryption registry.
 */

export const PLAINTEXT_ALLOWLIST: readonly string[] = [
	'achievements', // TODO: audit
	'activities', // TODO: audit
	'albumItems', // TODO: audit
	'albums', // TODO: audit
	'automations', // TODO: audit
	'boardViews', // TODO: audit
	'budgets', // TODO: audit
	'calculations', // TODO: audit
	'calendars', // TODO: audit
	'cardReviews', // FSRS scheduling state (numbers + due timestamp). No user-typed text — query path scans by `due` to find what's fällig today.
	'cardStudyBlocks', // Daily activity aggregate (date + counters). No user-typed content.
	'ccFavorites', // TODO: audit
	'ccLocationTags', // TODO: audit
	'ccLocations', // TODO: audit
	'cities', // TODO: audit
	'companionConversations', // TODO: audit
	'companionGoals', // TODO: audit
	'companionMessages', // TODO: audit
	'contactTags', // TODO: audit
	'conversationTags', // TODO: audit
	'dashboardConfigs', // TODO: audit
	'deckTags', // TODO: audit
	'dreamTags', // TODO: audit
	'entryTags', // TODO: audit
	'eventInvitations', // TODO: audit
	'eventItems', // TODO: audit
	'eventTags', // TODO: audit
	'fileTags', // TODO: audit
	'financeCategories', // TODO: audit
	'foodFavorites', // TODO: audit
	'goals', // TODO: audit
	'guideCollections', // TODO: audit
	'guideTags', // TODO: audit
	'imageTags', // TODO: audit
	'invCategories', // TODO: audit
	'invCollections', // TODO: audit
	'invItemTags', // TODO: audit
	'invLocations', // TODO: audit
	'manaLinks', // TODO: audit
	'markers', // TODO: audit
	'mealTags', // TODO: audit
	'moodTags', // TODO: audit
	'moods', // TODO: audit
	'noteTags', // TODO: audit
	'periodSymptoms', // TODO: audit
	'photoFavorites', // TODO: audit
	'photoMediaTags', // TODO: audit
	'presiDeckTags', // TODO: audit
	'qCollections', // TODO: audit
	'questionTags', // TODO: audit
	'quizAttempts', // TODO: audit
	'reminders', // TODO: audit
	'ritualLogs', // TODO: audit
	'ritualSteps', // TODO: audit
	'rituals', // TODO: audit
	'runs', // TODO: audit
	'savedFormulas', // TODO: audit
	'sequences', // TODO: audit
	'skillTags', // TODO: audit
	'skills', // TODO: audit
	'storageFolders', // TODO: audit
	'taskLabels', // TODO: audit
	'timeAlarms', // TODO: audit
	'timeBlockTags', // TODO: audit
	'timeClients', // TODO: audit
	'timeCountdownTimers', // TODO: audit
	'timeEntries', // TODO: audit
	'timeProjects', // TODO: audit
	'timeSettings', // TODO: audit
	'timeTemplates', // TODO: audit
	'timeWorldClocks', // TODO: audit
	'todoProjects', // TODO: audit
	'userSettings', // TODO: audit
	'wetterLocations', // TODO: audit
	'wetterSettings', // TODO: audit

	// ─── Retired-module legacy tables (lifted to standalone apps) ───
	// The Dexie schema persists for migration safety; the unified app no
	// longer actively writes these. Classified plaintext pending audit —
	// if any holds sensitive content, move it to the encryption registry.
	'comicCharacters', // TODO: audit (retired: comic → comicello)
	'comicStories', // TODO: audit (retired: comic → comicello)
	'customQuotes', // TODO: audit (retired: quotes → zitare)
	'locationLogs', // TODO: audit (retired: places)
	'meals', // TODO: audit (retired: food → nutriphi)
	'mukkeProjects', // TODO: audit (retired: music → mukke)
	'placeTags', // TODO: audit (retired: places)
	'places', // TODO: audit (retired: places)
	'playlistSongs', // TODO: audit (retired: music → mukke)
	'quotesFavorites', // TODO: audit (retired: quotes → zitare)
	'quotesListTags', // TODO: audit (retired: quotes → zitare)
	'quotesLists', // TODO: audit (retired: quotes → zitare)
	'songTags', // TODO: audit (retired: music → mukke)
	'wardrobeGarments', // TODO: audit (retired: wardrobe → werdrobe)
	'wardrobeOutfits', // TODO: audit (retired: wardrobe → werdrobe)

	// ─── Dormant articles/reader feature (schema present, no active
	// module code writes these in the unified app, no encryptRecord call).
	// Classified plaintext to match actual storage. AUDIT: articles +
	// articleHighlights can hold user reading content — if the reader is
	// revived, add real encryption (registry + encryptRecord) before use.
	'articles', // TODO: audit (dormant reader — holds user content, currently plaintext)
	'articleHighlights', // TODO: audit (dormant reader — user highlights, currently plaintext)
	'articleTags', // TODO: audit (dormant reader)
	'articleImportJobs', // import worker state — no user content
	'articleImportItems', // import worker state — no user content
	'articleExtractPickup', // import worker handoff row — no user content
];
