import { describe, it, expect } from 'vitest';
import {
	ONBOARDING_TEMPLATES,
	resolveModulesForTemplates,
	type OnboardingTemplateId,
} from './onboarding-templates';

describe('ONBOARDING_TEMPLATES', () => {
	it('has exactly 7 templates in the expected order', () => {
		expect(ONBOARDING_TEMPLATES.map((t) => t.id)).toEqual([
			'alltag',
			'arbeit',
			'health',
			'sport',
			'lernen',
			'entdecken',
			'erinnern',
		]);
	});

	it('every template has a name, description, icon, and at least 3 modules', () => {
		for (const tpl of ONBOARDING_TEMPLATES) {
			expect(tpl.name.length).toBeGreaterThan(0);
			expect(tpl.shortDescription.length).toBeGreaterThan(0);
			expect(tpl.iconName.length).toBeGreaterThan(0);
			expect(tpl.moduleIds.length).toBeGreaterThanOrEqual(3);
		}
	});

	it('no template references duplicate module ids within itself', () => {
		for (const tpl of ONBOARDING_TEMPLATES) {
			expect(new Set(tpl.moduleIds).size).toBe(tpl.moduleIds.length);
		}
	});
});

describe('resolveModulesForTemplates', () => {
	it('returns empty for empty selection', () => {
		expect(resolveModulesForTemplates([])).toEqual([]);
	});

	it('returns a single templates modules verbatim (under cap)', () => {
		expect(resolveModulesForTemplates(['alltag'])).toEqual([
			'todo',
			'calendar',
			'notes',
			'contacts',
		]);
	});

	it('dedupes across templates in priority order', () => {
		// Alltag first: todo/calendar/notes/contacts
		// Arbeit second: todo/calendar/mail/chat/times/notes — only mail/chat/times are new
		const result = resolveModulesForTemplates(['alltag', 'arbeit']);
		expect(result).toEqual(['todo', 'calendar', 'notes', 'contacts', 'mail', 'chat', 'times']);
	});

	it('preserves selection order (arbeit-first vs alltag-first)', () => {
		const a = resolveModulesForTemplates(['arbeit', 'alltag']);
		const b = resolveModulesForTemplates(['alltag', 'arbeit']);
		// Different first module confirms priority is the selection order,
		// not a fixed template order.
		expect(a[0]).toBe('todo'); // both start with todo, but arbeit's "mail" outranks alltag's "contacts"
		expect(a.indexOf('mail')).toBeLessThan(a.indexOf('contacts'));
		expect(b.indexOf('contacts')).toBeLessThan(b.indexOf('mail'));
	});

	it('honours the cap and drops overflow modules (default cap = 8)', () => {
		// All 7 templates picked — union pre-dedup is ~27 modules.
		const allIds: OnboardingTemplateId[] = [
			'alltag',
			'arbeit',
			'health',
			'sport',
			'lernen',
			'entdecken',
			'erinnern',
		];
		const result = resolveModulesForTemplates(allIds);
		expect(result.length).toBe(8);
		// Alltag's four modules must all make it — they're in the first template.
		expect(result.slice(0, 4)).toEqual(['todo', 'calendar', 'notes', 'contacts']);
	});

	it('respects a custom cap', () => {
		const result = resolveModulesForTemplates(['alltag', 'health'], 5);
		expect(result.length).toBe(5);
		expect(result).toEqual(['todo', 'calendar', 'notes', 'contacts', 'body']);
	});

	it('silently ignores unknown template ids', () => {
		const result = resolveModulesForTemplates([
			'alltag',
			'nonexistent' as OnboardingTemplateId,
			'arbeit',
		]);
		// Same as 'alltag' + 'arbeit' without the unknown one.
		expect(result).toEqual(['todo', 'calendar', 'notes', 'contacts', 'mail', 'chat', 'times']);
	});
});
