import type { WorkbenchTemplate } from './types';

/**
 * Fitness — wellness-category Workbench-Template.
 *
 * Scene für Körper-Arbeit + ein Wochenziel. Keine AI. Der User trackt
 * selbst; das Template nimmt ihm nur die initiale Einrichtung ab.
 *
 * Zielgruppe: jemand der "ich will regelmäßig trainieren" sagt und
 * nicht erst 15 Minuten Setup-Zeit investieren will. 1-Klick-Setup.
 */

export const fitnessTemplate: WorkbenchTemplate = {
	id: 'fitness',
	version: '1',
	label: 'Fitness',
	icon: '🏋️',
	tagline: 'Workout-Workspace mit Wochenziel',
	description: `Ein Starter-Kit für regelmäßige Bewegung. Legt dir eine Scene mit Body, Stretch und Sleep an und seed-et ein Wochenziel — dann kannst du direkt loslegen.

Was drin ist:

- **Scene**: Body · Stretch · Sleep — alles was du zum Tracken brauchst, nebeneinander.
- **1 Wochenziel**: "3 Workouts pro Woche" — der Goal-Tracker zählt TaskCompleted-Events aus dem Body-Modul.

Kein Agent. Keine Automation. Du trainierst, die Workbench zählt.`,
	category: 'wellness',
	color: '#EF4444',
	scene: {
		name: 'Fitness',
		description: 'Bewegung, Kraft, Schlaf',
		openApps: [
			{ appId: 'body', widthPx: 540 },
			{ appId: 'stretch', widthPx: 340 },
			{ appId: 'sleep', widthPx: 340 },
		],
	},
	seeds: {
		goals: [
			{
				stableId: 'template-fitness:goal:weekly-workouts',
				data: {
					title: '3 Workouts pro Woche',
					description: 'Zählt abgeschlossene Workouts im Body-Modul.',
					moduleId: 'body',
					metric: {
						source: 'event_count',
						eventType: 'TaskCompleted',
					},
					target: { value: 3, period: 'week', comparison: 'gte' },
				},
			},
		],
	},
};
