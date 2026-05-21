<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Navbar from './Navbar.svelte';
	import NavLink from './NavLink.svelte';
	import Pill from './Pill.svelte';
	import PillTabGroup from './PillTabGroup.svelte';
	import ManaLogoIcon from './ManaLogoIcon.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/Navbar',
		component: Navbar,
		tags: ['autodocs'],
	});

	let langValue = $state('de');
	let activeRoute = $state('decks');
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width: 100%; min-width: 720px;">
			<Navbar ariaLabel="Hauptnavigation">
				{#snippet brand()}
					<ManaLogoIcon size="md" />
					<span style="font-weight: 600;">mana e.V.</span>
				{/snippet}
				{#snippet nav()}
					<div style="display:flex; gap:1.5rem;">
						<NavLink href="/" active>Start</NavLink>
						<NavLink href="/spenden">Spenden</NavLink>
						<NavLink href="/devlog">Devlog</NavLink>
						<NavLink href="/transparenz">Transparenz</NavLink>
					</div>
				{/snippet}
				{#snippet actions()}
					<Pill primary href="/anmelden">Anmelden</Pill>
				{/snippet}
			</Navbar>
		</div>
	{/snippet}
</Story>

<Story name="WithPillTabGroup">
	{#snippet children()}
		<div style="width: 100%; min-width: 720px;">
			<Navbar ariaLabel="Cards-Navigation">
				{#snippet brand()}
					<span
						style="display:inline-flex; align-items:center; justify-content:center; width:1.75rem; height:1.75rem; border-radius:0.375rem; background: hsl(var(--color-primary)); color: hsl(var(--color-primary-foreground)); font-weight:600;"
						aria-hidden="true"
					>
						C
					</span>
					<span style="font-weight: 600;">Cards</span>
				{/snippet}
				{#snippet nav()}
					<PillTabGroup
						options={[
							{ id: 'decks', label: 'Stapel' },
							{ id: 'study', label: 'Lernen' },
							{ id: 'import', label: 'Import' },
							{ id: 'stats', label: 'Statistik' },
						]}
						value={activeRoute}
						onChange={(id) => (activeRoute = id)}
					/>
				{/snippet}
				{#snippet actions()}
					<PillTabGroup
						options={[
							{ id: 'de', label: 'DE' },
							{ id: 'en', label: 'EN' },
						]}
						value={langValue}
						onChange={(id) => (langValue = id)}
					/>
					<Pill href="/account" iconOnly ariaLabel="Profil" title="Profil">
						{#snippet leading()}
							<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
								<circle cx="8" cy="6" r="3" stroke="currentColor" fill="none" stroke-width="1.4" />
								<path
									d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4"
									stroke="currentColor"
									fill="none"
									stroke-width="1.4"
									stroke-linecap="round"
								/>
							</svg>
						{/snippet}
					</Pill>
				{/snippet}
			</Navbar>
		</div>
	{/snippet}
</Story>

<Story name="MinimalReadingView">
	{#snippet children()}
		<div style="width: 100%; min-width: 540px;">
			<Navbar>
				{#snippet brand()}
					<ManaLogoIcon size="sm" /><span style="font-weight: 600;">Zitare</span>
				{/snippet}
				{#snippet actions()}
					<NavLink href="#">Suche</NavLink>
					<Pill primary href="#">Beitragen</Pill>
				{/snippet}
			</Navbar>
		</div>
	{/snippet}
</Story>
