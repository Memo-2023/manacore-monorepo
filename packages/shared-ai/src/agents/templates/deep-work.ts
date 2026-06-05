import type { WorkbenchTemplate } from './types';

/**
 * Deep Work — work-category Workbench-Template.
 *
 * Ein Starter-Kit für konzentrierte Arbeitsphasen. Scene mit Todo /
 * Calendar / Notes / Times + ein Wochenziel für Fokus-Stunden.
 *
 * Kein AI-Agent. Das Template gibt die Struktur vor, der User bringt
 * die Arbeit.
 */

export const deepWorkTemplate: WorkbenchTemplate = {
	id: 'deep-work',
	version: '1',
	label: 'Deep Work',
	icon: '💻',
	tagline: 'Konzentrierter Arbeitsplatz mit Fokus-Tracking',
	description: `Ein Starter-Kit für konzentrierte Arbeit. Legt dir eine Scene mit Todo, Kalender, Notes und Time-Tracking an und seed-et ein Wochenziel für Deep-Work-Stunden.

Was drin ist:

- **Scene**: Todo · Kalender · Notes · Times — alles für fokussierte Sessions nebeneinander.
- **1 Wochenziel**: "20h Deep Work pro Woche" — zählt abgeschlossene Time-Tracking-Sessions.

Kein Agent. Das Setup ist da; der Rest ist deine Disziplin.`,
	category: 'work',
	color: '#1F2937',
	scene: {
		name: 'Deep Work',
		description: 'Fokus, Kalender, Notes, Zeit',
		openApps: [
			{ appId: 'todo', widthPx: 540 },
			{ appId: 'calendar', widthPx: 540 },
			{ appId: 'notes', widthPx: 440 },
			{ appId: 'times', widthPx: 340 },
		],
	},
	seeds: {
		goals: [
			{
				stableId: 'template-deepwork:goal:weekly-focus',
				data: {
					title: '20h Deep Work pro Woche',
					description: 'Summiert Time-Tracking-Sessions im Times-Modul.',
					moduleId: 'times',
					metric: {
						source: 'event_count',
						eventType: 'TimeSessionCompleted',
					},
					target: { value: 20, period: 'week', comparison: 'gte' },
				},
			},
		],
	},
};
