<!--
  Automations — Workbench ListView
  Create and manage cross-module automation rules.
  "When X happens in App A, do Y in App B."
-->
<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/data/database';
	import { automationsStore } from './stores/automations.svelte';
	import { SOURCE_OPTIONS, ACTION_OPTIONS, CONDITION_OPS } from './types';
	import type { LocalAutomation } from './types';
	import type { ConditionOp } from '$lib/triggers/conditions';
	import type { ViewProps } from '$lib/app-registry';
	import { Trash } from '@mana/shared-icons';
	import { generateSuggestions, dismissSuggestion, isSuggestionDismissed } from '$lib/triggers';
	import type { AutomationSuggestion } from '$lib/triggers';
	import { _ } from 'svelte-i18n';

	let { navigate, goBack, params }: ViewProps = $props();

	// ─── Data ────────────────────────────────────────────────
	let automations = $state<LocalAutomation[]>([]);
	let suggestions = $state<AutomationSuggestion[]>([]);

	$effect(() => {
		const sub = liveQuery(async () => {
			return db
				.table<LocalAutomation>('automations')
				.toArray()
				.then((all) => all.filter((a) => !a.deletedAt));
		}).subscribe((val) => {
			automations = val ?? [];
		});
		return () => sub.unsubscribe();
	});

	// ─── Suggestions ─────────────────────────────────────────
	async function refreshSuggestions() {
		const all = await generateSuggestions();
		suggestions = all.filter((s) => !isSuggestionDismissed(s.id));
	}

	$effect(() => {
		refreshSuggestions();
	});

	$effect(() => {
		automations;
		refreshSuggestions();
	});

	async function acceptSuggestion(sug: AutomationSuggestion) {
		await automationsStore.create({
			name: sug.name,
			sourceApp: sug.sourceApp,
			sourceCollection: sug.sourceCollection,
			sourceOp: sug.sourceOp,
			conditionField: sug.conditionField,
			conditionOp: sug.conditionOp,
			conditionValue: sug.conditionValue,
			targetApp: sug.targetApp,
			targetAction: sug.targetAction,
			targetParams: sug.targetParams,
		});
		suggestions = suggestions.filter((s) => s.id !== sug.id);
	}

	function handleDismiss(id: string) {
		dismissSuggestion(id);
		suggestions = suggestions.filter((s) => s.id !== id);
	}

	// ─── Create Form ─────────────────────────────────────────
	let showCreate = $state(false);
	let newName = $state('');
	let newSourceKey = $state('');
	let newSourceOp = $state<'insert' | 'update'>('insert');
	let newConditionField = $state('');
	let newConditionOp = $state<ConditionOp>('contains');
	let newConditionValue = $state('');
	let newActionKey = $state('');
	let newParams = $state<Record<string, string>>({});

	let selectedSource = $derived(
		SOURCE_OPTIONS.find((s) => `${s.app}.${s.collection}` === newSourceKey)
	);
	let selectedAction = $derived(
		ACTION_OPTIONS.find((a) => `${a.app}.${a.action}` === newActionKey)
	);

	function resetForm() {
		newName = '';
		newSourceKey = '';
		newSourceOp = 'insert';
		newConditionField = '';
		newConditionOp = 'contains';
		newConditionValue = '';
		newActionKey = '';
		newParams = {};
		showCreate = false;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		if (!selectedSource || !selectedAction) return;
		const name = newName.trim() || `${selectedSource.appLabel} → ${selectedAction.appLabel}`;
		await automationsStore.create({
			name,
			sourceApp: selectedSource.app,
			sourceCollection: selectedSource.collection,
			sourceOp: newSourceOp,
			conditionField: newConditionField || undefined,
			conditionOp: newConditionField ? newConditionOp : undefined,
			conditionValue: newConditionField ? newConditionValue : undefined,
			targetApp: selectedAction.app,
			targetAction: selectedAction.action,
			targetParams: Object.keys(newParams).length > 0 ? newParams : undefined,
		});
		resetForm();
	}

	// ─── Helpers ─────────────────────────────────────────────
	function sourceLabel(a: LocalAutomation): string {
		const src = SOURCE_OPTIONS.find(
			(s) => s.app === a.sourceApp && s.collection === a.sourceCollection
		);
		return src ? src.appLabel : a.sourceApp;
	}

	function sourceDetail(a: LocalAutomation): string {
		const src = SOURCE_OPTIONS.find(
			(s) => s.app === a.sourceApp && s.collection === a.sourceCollection
		);
		const opLabel =
			a.sourceOp === 'insert'
				? $_('automations.list_view.detail_inserted')
				: $_('automations.list_view.detail_updated');
		return src ? `${src.collectionLabel} ${opLabel}` : `${a.sourceCollection} ${opLabel}`;
	}

	function actionLabel(a: LocalAutomation): string {
		const act = ACTION_OPTIONS.find((o) => o.app === a.targetApp && o.action === a.targetAction);
		return act ? act.appLabel : a.targetApp;
	}

	function actionDetail(a: LocalAutomation): string {
		const act = ACTION_OPTIONS.find((o) => o.app === a.targetApp && o.action === a.targetAction);
		if (!act) return a.targetAction;
		return act.actionLabel;
	}

	function conditionLabel(a: LocalAutomation): string {
		if (!a.conditionField || !a.conditionValue) return '';
		const opLabel = CONDITION_OPS.find((o) => o.value === a.conditionOp)?.label ?? a.conditionOp;
		return `${a.conditionField} ${opLabel} "${a.conditionValue}"`;
	}
</script>

<div class="automations-view">
	<!-- Suggestions -->
	{#if suggestions.length > 0}
		<div class="section">
			<span class="section-label">{$_('automations.list_view.section_suggestions')}</span>
			{#each suggestions as sug (sug.id)}
				<div class="sug-card">
					<div class="sug-left">
						<span class="sug-icon">&#9889;</span>
					</div>
					<div class="sug-body">
						<span class="sug-title">{sug.name}</span>
						<span class="sug-desc">{sug.description}</span>
					</div>
					<div class="sug-actions">
						<button class="btn-sm primary" onclick={() => acceptSuggestion(sug)}
							>{$_('automations.list_view.action_activate')}</button
						>
						<button class="btn-sm ghost" onclick={() => handleDismiss(sug.id)}
							>{$_('automations.list_view.action_dismiss')}</button
						>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Active Automations -->
	<div class="section">
		<div class="section-header">
			<span class="section-label">{$_('automations.list_view.section_active')}</span>
			{#if !showCreate}
				<button class="btn-sm outline" onclick={() => (showCreate = true)}
					>{$_('automations.list_view.action_new')}</button
				>
			{/if}
		</div>

		{#if showCreate}
			<form class="create-form" onsubmit={handleCreate}>
				<input
					class="form-input full"
					type="text"
					placeholder={$_('automations.list_view.placeholder_name')}
					bind:value={newName}
				/>

				<div class="form-step">
					<span class="step-badge when">{$_('automations.list_view.step_when')}</span>
					<div class="step-fields">
						<select class="form-select" bind:value={newSourceKey}>
							<option value="">{$_('automations.list_view.placeholder_source')}</option>
							{#each SOURCE_OPTIONS as src}
								<option value="{src.app}.{src.collection}"
									>{src.appLabel} — {src.collectionLabel}</option
								>
							{/each}
						</select>
						{#if selectedSource}
							<select class="form-select narrow" bind:value={newSourceOp}>
								<option value="insert">{$_('automations.list_view.option_when_inserted')}</option>
								<option value="update">{$_('automations.list_view.option_when_updated')}</option>
							</select>
						{/if}
					</div>
				</div>

				{#if selectedSource}
					<div class="form-step">
						<span class="step-badge filter">{$_('automations.list_view.step_filter')}</span>
						<div class="step-fields">
							<select class="form-select" bind:value={newConditionField}>
								<option value="">{$_('automations.list_view.option_no_filter')}</option>
								{#each selectedSource.fields as field}
									<option value={field}>{field}</option>
								{/each}
							</select>
							{#if newConditionField}
								<select class="form-select narrow" bind:value={newConditionOp}>
									{#each CONDITION_OPS as op}
										<option value={op.value}>{op.label}</option>
									{/each}
								</select>
								<input
									class="form-input"
									type="text"
									placeholder={$_('automations.list_view.placeholder_value')}
									bind:value={newConditionValue}
								/>
							{/if}
						</div>
					</div>
				{/if}

				<div class="form-step">
					<span class="step-badge then">{$_('automations.list_view.step_then')}</span>
					<div class="step-fields">
						<select class="form-select" bind:value={newActionKey}>
							<option value="">{$_('automations.list_view.placeholder_action')}</option>
							{#each ACTION_OPTIONS as act}
								<option value="{act.app}.{act.action}">{act.appLabel} — {act.actionLabel}</option>
							{/each}
						</select>
						{#if selectedAction}
							{#each selectedAction.params as param}
								<input
									class="form-input"
									type="text"
									placeholder={param.label}
									value={newParams[param.key] ?? ''}
									oninput={(e) => {
										newParams = {
											...newParams,
											[param.key]: (e.target as HTMLInputElement).value,
										};
									}}
								/>
							{/each}
						{/if}
					</div>
				</div>

				<div class="form-footer">
					<button type="button" class="btn-sm ghost" onclick={resetForm}
						>{$_('automations.list_view.action_cancel')}</button
					>
					<button type="submit" class="btn-sm primary" disabled={!selectedSource || !selectedAction}
						>{$_('automations.list_view.action_create')}</button
					>
				</div>
			</form>
		{/if}

		<!-- Automation Cards -->
		{#each automations as auto (auto.id)}
			<div class="auto-card" class:inactive={!auto.enabled}>
				<div class="auto-header">
					<button
						class="toggle"
						class:on={auto.enabled}
						onclick={() => automationsStore.toggle(auto.id)}
						title={auto.enabled
							? $_('automations.list_view.toggle_disable')
							: $_('automations.list_view.toggle_enable')}
					>
						<span class="toggle-track"><span class="toggle-thumb"></span></span>
					</button>
					<span class="auto-name">{auto.name}</span>
					<button
						class="icon-btn danger"
						onclick={() => automationsStore.remove(auto.id)}
						title={$_('automations.list_view.action_delete')}
					>
						<Trash size={12} />
					</button>
				</div>
				<div class="auto-flow">
					<span class="flow-chip when">{sourceLabel(auto)}</span>
					<span class="flow-detail">{sourceDetail(auto)}</span>
					{#if conditionLabel(auto)}
						<span class="flow-arrow">&#8594;</span>
						<span class="flow-chip filter">{$_('automations.list_view.flow_when')}</span>
						<span class="flow-detail">{conditionLabel(auto)}</span>
					{/if}
					<span class="flow-arrow">&#8594;</span>
					<span class="flow-chip then">{actionLabel(auto)}</span>
					<span class="flow-detail">{actionDetail(auto)}</span>
				</div>
			</div>
		{/each}

		{#if automations.length === 0 && !showCreate}
			<div class="empty">
				<p class="empty-title">{$_('automations.list_view.empty_title')}</p>
				<p class="empty-hint">{$_('automations.list_view.empty_hint')}</p>
				<button class="btn-sm primary" onclick={() => (showCreate = true)}
					>{$_('automations.list_view.empty_action')}</button
				>
			</div>
		{/if}
	</div>
</div>

<style>
	.automations-view {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.625rem;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: hsl(var(--color-muted-foreground));
	}

	/* ── Buttons ──────────────────────────── */
	/* Brand violet (#8b5cf6) is the automations module accent — kept literal */
	.btn-sm {
		padding: 0.3125rem 0.625rem;
		border-radius: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.btn-sm.primary {
		background: #8b5cf6;
		color: white;
	}
	.btn-sm.primary:hover:not(:disabled) {
		background: #7c3aed;
	}
	.btn-sm.primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn-sm.outline {
		background: transparent;
		border: 1px dashed hsl(var(--color-border));
		color: hsl(var(--color-muted-foreground));
	}
	.btn-sm.outline:hover {
		border-color: #8b5cf6;
		color: #8b5cf6;
	}
	.btn-sm.ghost {
		background: transparent;
		color: hsl(var(--color-muted-foreground));
	}
	.btn-sm.ghost:hover {
		color: hsl(var(--color-foreground));
	}

	.icon-btn {
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		opacity: 0;
		transition: all 0.15s;
		color: hsl(var(--color-muted-foreground));
	}
	.icon-btn.danger:hover {
		color: hsl(var(--color-error));
		background: hsl(var(--color-error) / 0.1);
	}

	/* ── Suggestion Cards ─────────────────── */
	.sug-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.625rem;
		background: linear-gradient(
			135deg,
			hsl(var(--color-warning) / 0.06),
			hsl(var(--color-warning) / 0.02)
		);
		border: 1px solid hsl(var(--color-warning) / 0.15);
	}

	.sug-left {
		font-size: 1.125rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.sug-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.sug-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
	}

	.sug-desc {
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
		line-height: 1.3;
	}

	.sug-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	/* ── Automation Cards ─────────────────── */
	.auto-card {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.625rem;
		background: hsl(var(--color-card));
		border: 1px solid hsl(var(--color-border));
		transition: all 0.15s;
	}
	.auto-card:hover {
		border-color: color-mix(in srgb, #8b5cf6 20%, transparent);
	}
	.auto-card:hover .icon-btn {
		opacity: 1;
	}
	.auto-card.inactive {
		opacity: 0.45;
	}

	.auto-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.auto-name {
		flex: 1;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Toggle Switch */
	.toggle {
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}
	.toggle-track {
		display: block;
		width: 28px;
		height: 16px;
		border-radius: 9999px;
		background: hsl(var(--color-border));
		position: relative;
		transition: background 0.2s;
	}
	.toggle.on .toggle-track {
		background: #8b5cf6;
	}
	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		border-radius: 9999px;
		background: white;
		transition: transform 0.2s;
	}
	.toggle.on .toggle-thumb {
		transform: translateX(12px);
	}

	/* Flow visualization */
	.auto-flow {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
		padding-left: 2.125rem;
	}

	.flow-chip {
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	/* When/filter/then accents are deliberate flow-step colors (blue/amber/green),
	   not theme tokens — they encode trigger/condition/action semantics. */
	.flow-chip.when {
		background: rgb(59 130 246 / 0.12);
		color: #60a5fa;
	}
	.flow-chip.filter {
		background: rgb(245 158 11 / 0.12);
		color: #fbbf24;
	}
	.flow-chip.then {
		background: rgb(34 197 94 / 0.12);
		color: #4ade80;
	}

	.flow-detail {
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
	}

	.flow-arrow {
		font-size: 0.625rem;
		color: hsl(var(--color-muted-foreground));
		opacity: 0.4;
	}

	/* ── Create Form ──────────────────────── */
	.create-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: 0.75rem;
		background: hsl(var(--color-card));
		border: 1px solid color-mix(in srgb, #8b5cf6 20%, transparent);
	}

	.form-step {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.step-badge {
		padding: 0.1875rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.5625rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
		margin-top: 0.3125rem;
	}
	/* Same flow-step palette as flow-chip — kept literal */
	.step-badge.when {
		background: rgb(59 130 246 / 0.12);
		color: #60a5fa;
	}
	.step-badge.filter {
		background: rgb(245 158 11 / 0.12);
		color: #fbbf24;
	}
	.step-badge.then {
		background: rgb(34 197 94 / 0.12);
		color: #4ade80;
	}

	.step-fields {
		display: flex;
		flex-direction: column;
		gap: 0.3125rem;
		flex: 1;
		min-width: 0;
	}

	.form-input,
	.form-select {
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid hsl(var(--color-border));
		background: transparent;
		color: hsl(var(--color-foreground));
		font-size: 0.75rem;
		outline: none;
		width: 100%;
	}
	.form-input.full {
		width: 100%;
	}
	.form-input:focus,
	.form-select:focus {
		border-color: #8b5cf6;
	}
	.form-input::placeholder {
		color: hsl(var(--color-muted-foreground));
	}
	.form-select.narrow {
		width: auto;
	}

	.form-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.375rem;
		padding-top: 0.25rem;
	}

	/* ── Empty ────────────────────────────── */
	.empty {
		text-align: center;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
	}
	.empty-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(var(--color-foreground));
		margin: 0;
	}
	.empty-hint {
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
		margin: 0 0 0.5rem;
	}

	@media (max-width: 640px) {
		.automations-view {
			padding: 0.5rem;
		}
		.auto-card {
			padding: 0.75rem;
			min-height: 44px;
		}
	}
</style>
