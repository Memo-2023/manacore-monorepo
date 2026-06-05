<!--
	Sync Conflict Toast — surfaces field-LWW overwrites with a Restore
	option. One toast per (tableName, recordId) — see conflict-store
	for the coalescing rules.

	Mounted globally in +layout.svelte; reads conflictStore.visible
	directly (it's a Svelte 5 $state-backed export).

	UX choices:
	- Stacks in the bottom-right corner above the OfflineIndicator
	- Each toast has Restore + Dismiss buttons
	- Restore reverts ALL coalesced fields for that record in one tx
	- The actual values are NOT shown — they could be encrypted
	  blobs (we'd need to decrypt with the active key, which is
	  doable but adds complexity for marginal UX gain on an MVP).
	  Showing "X fields wurden überschrieben" + the table name +
	  the record id is enough context for the user to recognise the
	  affected record (which they were just editing seconds ago).
-->
<script lang="ts">
	import { conflictStore } from '$lib/data/conflict-store.svelte';
	import { ArrowCounterClockwise, X, Warning } from '@mana/shared-icons';

	let conflicts = $derived(conflictStore.visible);

	/** Map raw table names to user-readable module labels. Tables not
	 *  in this map fall through to the bare table name — that's still
	 *  better than nothing for debug purposes. */
	const TABLE_LABELS: Record<string, string> = {
		tasks: 'Aufgabe',
		todoProjects: 'Projekt',
		notes: 'Notiz',
		messages: 'Chat-Nachricht',
		conversations: 'Chat',
		dreams: 'Traum',
		memos: 'Memo',
		memories: 'Erinnerung',
		contacts: 'Kontakt',
		events: 'Termin',
		timeBlocks: 'Zeitblock',
		period: 'Zyklus',
		periodDayLogs: 'Tageseintrag',
		transactions: 'Transaktion',
		cards: 'Karte',
		cardDecks: 'Kartendeck',
		documents: 'Dokument',
		links: 'Link',
		meals: 'Mahlzeit',
		songs: 'Song',
		mukkePlaylists: 'Playlist',
		images: 'Bild',
		boards: 'Board',
		files: 'Datei',
		invItems: 'Inventar-Eintrag',
		plants: 'Pflanze',
		questions: 'Frage',
		answers: 'Antwort',
		presiDecks: 'Präsentation',
		slides: 'Folie',
		socialEvents: 'Event',
		eventGuests: 'Gast',
	};

	function labelFor(tableName: string): string {
		return TABLE_LABELS[tableName] ?? tableName;
	}

	function fieldList(fields: Record<string, unknown>): string {
		const names = Object.keys(fields);
		if (names.length === 1) return `Feld »${names[0]}«`;
		if (names.length <= 3) return `Felder »${names.join('«, »')}«`;
		return `${names.length} Felder`;
	}
</script>

{#if conflicts.length > 0}
	<div class="conflict-stack" role="region" aria-label="Sync-Konflikte">
		{#each conflicts as conflict (conflict.id)}
			<div class="conflict" role="alertdialog">
				<div class="header">
					<Warning size={16} color="rgb(180, 83, 9)" />
					<span class="title">
						{labelFor(conflict.tableName)} überschrieben
					</span>
					<button
						class="close"
						type="button"
						aria-label="Verwerfen"
						onclick={() => conflictStore.dismiss(conflict.id)}
					>
						<X size={14} />
					</button>
				</div>
				<p class="body">
					Eine andere Sitzung hat dein Edit auf {fieldList(conflict.fields)} überschrieben. Soll deine
					Version wiederhergestellt werden?
				</p>
				<div class="actions">
					<button
						class="btn btn-primary"
						type="button"
						onclick={() => conflictStore.restore(conflict.id)}
					>
						<ArrowCounterClockwise size={14} />
						Wiederherstellen
					</button>
					<button class="btn" type="button" onclick={() => conflictStore.dismiss(conflict.id)}>
						Behalten
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.conflict-stack {
		position: fixed;
		bottom: 4rem; /* above OfflineIndicator */
		right: 1rem;
		z-index: 9000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 22rem;
		pointer-events: none;
	}

	.conflict {
		pointer-events: auto;
		background: hsl(var(--color-surface));
		border: 1px solid rgba(245, 158, 11, 0.4);
		border-left: 4px solid rgb(245, 158, 11);
		border-radius: 0.5rem;
		padding: 0.75rem 0.875rem;
		box-shadow:
			0 10px 20px -5px rgba(0, 0, 0, 0.15),
			0 4px 8px -2px rgba(0, 0, 0, 0.08);
		font-size: 0.85rem;
		animation: slide-in 180ms ease-out;
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.title {
		font-weight: 600;
		color: var(--text-primary, #111);
		flex: 1;
		min-width: 0;
	}

	.close {
		background: transparent;
		border: none;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		padding: 0.125rem;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
	}

	.close:hover {
		color: var(--text-primary, #111);
		background: hsl(var(--color-surface-hover));
	}

	.body {
		margin: 0.25rem 0 0.625rem 0;
		color: var(--text-secondary, #6b7280);
		line-height: 1.4;
	}

	.actions {
		display: flex;
		gap: 0.375rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.375rem;
		background: hsl(var(--color-surface));
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		color: var(--text-primary, #111);
	}

	.btn:hover {
		background: var(--surface-muted, #f3f4f6);
	}

	.btn-primary {
		background: hsl(var(--color-primary));
		color: white;
		border-color: transparent;
	}

	.btn-primary:hover {
		background: var(--primary-dark, #4f46e5);
	}

	@media (prefers-color-scheme: dark) {
		.conflict {
			background: hsl(var(--color-surface));
			border-color: rgba(245, 158, 11, 0.5);
			border-left-color: rgb(245, 158, 11);
		}
		.title {
			color: #f3f4f6;
		}
		.body {
			color: #9ca3af;
		}
		.btn {
			background: hsl(var(--color-surface));
			border-color: hsl(var(--color-border));
			color: #e5e7eb;
		}
		.btn:hover {
			background: var(--surface-muted, #111827);
		}
	}
</style>
