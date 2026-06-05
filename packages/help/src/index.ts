/**
 * @mana/help — Unified help package
 *
 * Consolidates shared-help-types + shared-help-content + shared-help-ui.
 */

// === Types (from shared-help-types) ===
export * from './content';
export * from './schemas';
export * from './search-types';
export { getManaFAQs, getManaFeature } from './mana-faq';
export { getPrivacyFAQs, type PrivacyFAQOptions } from './privacy-faq';

// === Content utilities (from shared-help-content) ===
export {
	parseMarkdown,
	parseMarkdownFiles,
	stripHtml,
	generateExcerpt,
	type ParsedContent,
	type ParseOptions,
} from './parser';

export {
	parseFAQContent,
	parseFeatureContent,
	parseShortcutsContent,
	parseGettingStartedContent,
	parseChangelogContent,
	parseContactContent,
	loadHelpContentFromFiles,
	type LoaderOptions,
} from './loader';

export { mergeContent, createEmptyContent } from './merger';
export { sanitizeHtml } from './sanitize';
export { buildSearchIndex, search, createSearcher, flattenContentForSearch } from './search-engine';

// === UI Components (from shared-help-ui) ===
export { default as HelpPage } from './pages/HelpPage.svelte';
export { default as FAQSection } from './components/FAQSection.svelte';
export { default as FAQItem } from './components/FAQItem.svelte';
export { default as FeaturesOverview } from './components/FeaturesOverview.svelte';
export { default as FeatureCard } from './components/FeatureCard.svelte';
export { default as KeyboardShortcuts } from './components/KeyboardShortcuts.svelte';
export { default as GettingStartedGuide } from './components/GettingStartedGuide.svelte';
export { default as ChangelogSection } from './components/ChangelogSection.svelte';
export { default as ChangelogEntry } from './components/ChangelogEntry.svelte';
export { default as ContactSection } from './components/ContactSection.svelte';
export { default as HelpSearch } from './components/HelpSearch.svelte';

export { defaultTranslationsDE, defaultTranslationsEN, getHelpTranslations } from './translations';

export type {
	HelpPageProps,
	HelpPageTranslations,
	HelpSection,
	FAQSectionProps,
	FeaturesOverviewProps,
	KeyboardShortcutsProps,
	GettingStartedGuideProps,
	ChangelogEntryProps,
	ChangelogSectionProps,
	ContactSectionProps,
	HelpSearchProps,
} from './ui-types';
