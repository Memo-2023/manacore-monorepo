import type { SiteTemplate } from './types';

export const portfolioTemplate: SiteTemplate = {
	id: 'portfolio',
	name: 'Portfolio',
	description: 'Startseite · Über mich · Arbeiten · Kontakt. Für Kreative, Freelancer, Entwickler.',
	tag: 'privat',
	pages: [
		{
			path: '/',
			title: 'Start',
			order: 1024,
			blocks: [
				{
					localId: 'hero',
					type: 'hero',
					props: {
						eyebrow: 'Portfolio',
						title: 'Hallo, ich bin [Dein Name]',
						subtitle:
							'Designer · Entwickler · Freelancer. Hier sind einige Projekte, an denen ich zuletzt gearbeitet habe.',
						ctaLabel: 'Arbeiten ansehen',
						ctaHref: '/arbeiten',
						align: 'center',
						background: 'gradient',
					},
				},
				{
					localId: 'intro',
					type: 'richText',
					props: {
						content:
							'Kurze Einführung in dein Schaffen. Was treibt dich an, welche Art Projekte übernimmst du, wofür stehst du.',
						align: 'center',
						size: 'md',
					},
				},
			],
		},
		{
			path: '/ueber-mich',
			title: 'Über mich',
			order: 2048,
			blocks: [
				{
					localId: 'hero',
					type: 'hero',
					props: {
						title: 'Über mich',
						subtitle: 'Ein bisschen mehr Hintergrund zu meiner Arbeit.',
						align: 'left',
						background: 'subtle',
					},
				},
				{
					localId: 'text',
					type: 'richText',
					props: {
						content:
							'Erzähl deine Geschichte. Woher kommst du? Was hast du studiert / wo gelernt? Welche Projekte haben dich geprägt?\n\nDieser Block akzeptiert mehrere Absätze — trenne sie mit einer leeren Zeile.',
						align: 'left',
						size: 'md',
					},
				},
			],
		},
		{
			path: '/arbeiten',
			title: 'Arbeiten',
			order: 3072,
			blocks: [
				{
					localId: 'hero',
					type: 'hero',
					props: {
						title: 'Ausgewählte Arbeiten',
						subtitle: 'Ein Querschnitt meiner letzten Projekte.',
						align: 'center',
						background: 'none',
					},
				},
				{
					localId: 'gallery',
					type: 'gallery',
					props: {
						title: '',
						images: [],
						layout: 'grid',
						columns: 3,
						gap: 'md',
						lightbox: true,
					},
				},
			],
		},
		{
			path: '/kontakt',
			title: 'Kontakt',
			order: 4096,
			blocks: [
				{
					localId: 'hero',
					type: 'hero',
					props: {
						title: 'Kontakt',
						subtitle: 'Projekt-Anfrage? Kollaboration? Schreib mir.',
						align: 'center',
						background: 'subtle',
					},
				},
				{
					localId: 'form',
					type: 'form',
					props: {
						title: '',
						description: '',
						submitLabel: 'Senden',
						successMessage: 'Danke! Ich melde mich bald bei dir.',
						target: 'inbox',
						fields: [
							{
								name: 'name',
								label: 'Name',
								type: 'text',
								required: true,
								placeholder: '',
								helpText: '',
								maxLength: 120,
							},
							{
								name: 'email',
								label: 'E-Mail',
								type: 'email',
								required: true,
								placeholder: 'du@beispiel.de',
								helpText: '',
								maxLength: 200,
							},
							{
								name: 'message',
								label: 'Nachricht',
								type: 'textarea',
								required: true,
								placeholder: 'Worum geht’s?',
								helpText: '',
								maxLength: 2000,
							},
						],
					},
				},
			],
		},
	],
};
