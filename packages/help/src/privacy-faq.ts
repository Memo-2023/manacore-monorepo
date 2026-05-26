/**
 * Shared Privacy, Data Protection & Tech Independence FAQ content
 * Reusable across all apps — covers GDPR, encryption, self-hosting,
 * tech stack independence, data export, account deletion
 */

import type { FAQItem } from './content.js';

export interface PrivacyFAQOptions {
	/**
	 * What kind of data does the app handle?
	 * Used in the main privacy FAQ to make it specific.
	 * @example 'Aufgaben' / 'tasks', 'Dateien' / 'files', 'Chats' / 'chats'
	 */
	dataTypeDE: string;
	dataTypeEN: string;

	/**
	 * Optional extra bullet points for the main privacy FAQ (app-specific).
	 * Each entry is a single `<li>` string (without the `<li>` tags).
	 * @example ['<strong>Lokale Modelle</strong>: Deine Daten verlassen nie unseren Server']
	 */
	extraBulletsDE?: string[];
	extraBulletsEN?: string[];
}

/**
 * Returns shared FAQ items covering privacy, data protection, and tech independence.
 * The main privacy FAQ can be customized per app via options.
 *
 * @example
 * ```ts
 * import { getPrivacyFAQs } from './content';
 *
 * const privacyFAQs = getPrivacyFAQs(locale, {
 *   dataTypeDE: 'Aufgaben',
 *   dataTypeEN: 'tasks',
 *   extraBulletsDE: ['<strong>Offline</strong>: Funktioniert auch ohne Internet'],
 *   extraBulletsEN: ['<strong>Offline</strong>: Works without internet'],
 * });
 * ```
 */
export function getPrivacyFAQs(locale: string, options: PrivacyFAQOptions): FAQItem[] {
	const isDE = locale === 'de';

	const extraDE = (options.extraBulletsDE || []).map((b) => `<li>${b}</li>`).join('');
	const extraEN = (options.extraBulletsEN || []).map((b) => `<li>${b}</li>`).join('');

	return [
		{
			id: 'faq-privacy',
			question: isDE
				? `Wie werden meine ${options.dataTypeDE} geschützt?`
				: `How are my ${options.dataTypeEN} protected?`,
			answer: isDE
				? `<p>Deine Daten sind sicher bei Mana:</p><ul><li><strong>Verschlüsselung</strong>: Alle Daten werden bei der Übertragung (TLS) verschlüsselt</li><li><strong>DSGVO-konform</strong>: Wir halten uns an die EU-Datenschutzverordnung</li><li><strong>Kein Datenverkauf</strong>: Deine ${options.dataTypeDE} werden nie an Dritte verkauft oder für Werbung genutzt</li><li><strong>Self-Hosted</strong>: Mana läuft auf eigenen Servern — keine Abhängigkeit von Cloud-Anbietern wie AWS oder Google</li><li><strong>Open Source</strong>: Der Quellcode ist einsehbar — Transparenz statt Vertrauen</li>${extraDE}</ul>`
				: `<p>Your data is secure with Mana:</p><ul><li><strong>Encryption</strong>: All data is encrypted in transit (TLS)</li><li><strong>GDPR compliant</strong>: We follow EU data protection regulations</li><li><strong>No data selling</strong>: Your ${options.dataTypeEN} are never sold to third parties or used for advertising</li><li><strong>Self-hosted</strong>: Mana runs on its own servers — no dependency on cloud providers like AWS or Google</li><li><strong>Open source</strong>: The source code is viewable — transparency over trust</li>${extraEN}</ul>`,
			category: 'privacy',
			order: 95,
			language: isDE ? 'de' : 'en',
			featured: true,
			tags: isDE
				? ['datenschutz', 'dsgvo', 'sicherheit', 'verschlüsselung']
				: ['privacy', 'gdpr', 'security', 'encryption'],
		},
		{
			id: 'faq-tech-independence',
			question: isDE
				? 'Wie unabhängig ist Mana von großen Tech-Konzernen?'
				: 'How independent is Mana from big tech companies?',
			answer: isDE
				? '<p>Mana ist bewusst <strong>technologisch unabhängig</strong> aufgebaut:</p><ul><li><strong>Eigene Server</strong>: Alle Dienste laufen auf einem eigenen Mac Mini Server — kein AWS, kein Google Cloud, kein Azure</li><li><strong>Eigene KI</strong>: Lokale KI-Modelle (Gemma, Qwen, LLaVA) laufen auf unserem eigenen GPU-Server mit NVIDIA RTX 3090 — deine Daten verlassen nie unsere Infrastruktur</li><li><strong>Keine Google/Apple-Anmeldung</strong>: Eigenes Auth-System (Mana Core Auth) — kein OAuth über Drittanbieter, keine Tracking-Cookies von Google oder Facebook</li><li><strong>Eigene Suche</strong>: SearXNG Meta-Suchmaschine statt Google Search API</li><li><strong>Eigener Speicher</strong>: MinIO (S3-kompatibel) statt AWS S3 oder Google Cloud Storage</li><li><strong>Eigene Datenbank</strong>: PostgreSQL auf eigenem Server statt Cloud-Datenbanken</li><li><strong>Keine Tracking-SDKs</strong>: Kein Google Analytics, kein Facebook Pixel, kein Amplitude — und gar kein Web-Analytics</li></ul><p>Das Ziel: Ein digitales Zuhause, das dir gehört — nicht Big Tech.</p>'
				: '<p>Mana is deliberately built to be <strong>technologically independent</strong>:</p><ul><li><strong>Own servers</strong>: All services run on a dedicated Mac Mini server — no AWS, no Google Cloud, no Azure</li><li><strong>Own AI</strong>: Local AI models (Gemma, Qwen, LLaVA) run on our own GPU server with NVIDIA RTX 3090 — your data never leaves our infrastructure</li><li><strong>No Google/Apple login</strong>: Own auth system (Mana Core Auth) — no OAuth via third parties, no tracking cookies from Google or Facebook</li><li><strong>Own search</strong>: SearXNG meta-search engine instead of Google Search API</li><li><strong>Own storage</strong>: MinIO (S3-compatible) instead of AWS S3 or Google Cloud Storage</li><li><strong>Own database</strong>: PostgreSQL on own server instead of cloud databases</li><li><strong>No tracking SDKs</strong>: No Google Analytics, no Facebook Pixel, no Amplitude — and no web analytics at all</li></ul><p>The goal: A digital home that belongs to you — not big tech.</p>',
			category: 'privacy',
			order: 96,
			language: isDE ? 'de' : 'en',
			featured: true,
			tags: isDE
				? ['unabhängig', 'self-hosted', 'eigene-server', 'kein-google', 'kein-aws']
				: ['independent', 'self-hosted', 'own-servers', 'no-google', 'no-aws'],
		},
		{
			id: 'faq-data-export',
			question: isDE ? 'Kann ich meine Daten exportieren?' : 'Can I export my data?',
			answer: isDE
				? '<p>Ja! Du hast jederzeit volle Kontrolle über deine Daten:</p><ul><li><strong>Datenexport</strong>: Exportiere alle deine Daten in gängigen, offenen Formaten (JSON, CSV, vCard, iCal — je nach App)</li><li><strong>Datenportabilität</strong>: Gemäß DSGVO Art. 20 hast du das Recht auf Datenübertragbarkeit</li><li><strong>Keine Vendor-Lock-in</strong>: Deine Daten gehören dir — nicht uns. Wir nutzen offene Standards, damit du jederzeit zu einem anderen Dienst wechseln kannst</li><li><strong>Standard-Formate</strong>: Keine proprietären Formate — alles ist mit gängigen Tools les- und importierbar</li></ul>'
				: '<p>Yes! You have full control over your data at all times:</p><ul><li><strong>Data export</strong>: Export all your data in common, open formats (JSON, CSV, vCard, iCal — depending on the app)</li><li><strong>Data portability</strong>: Under GDPR Art. 20 you have the right to data portability</li><li><strong>No vendor lock-in</strong>: Your data belongs to you — not us. We use open standards so you can switch to another service at any time</li><li><strong>Standard formats</strong>: No proprietary formats — everything is readable and importable with common tools</li></ul>',
			category: 'privacy',
			order: 97,
			language: isDE ? 'de' : 'en',
			tags: isDE
				? ['export', 'daten', 'portabilität', 'dsgvo', 'offene-formate']
				: ['export', 'data', 'portability', 'gdpr', 'open-formats'],
		},
		{
			id: 'faq-account-deletion',
			question: isDE ? 'Kann ich mein Konto löschen?' : 'Can I delete my account?',
			answer: isDE
				? '<p>Ja, jederzeit:</p><ul><li>Gehe zu <strong>Profil > Konto löschen</strong></li><li>Alle deine Daten werden <strong>dauerhaft und unwiderruflich</strong> gelöscht</li><li>Dies umfasst alle Inhalte, Einstellungen und persönlichen Daten</li><li>Geteilte Inhalte (z.B. Share-Links) werden ebenfalls deaktiviert</li></ul><p>Wir empfehlen, vorher einen Datenexport durchzuführen.</p>'
				: '<p>Yes, at any time:</p><ul><li>Go to <strong>Profile > Delete Account</strong></li><li>All your data will be <strong>permanently and irreversibly</strong> deleted</li><li>This includes all content, settings, and personal data</li><li>Shared content (e.g., share links) will also be deactivated</li></ul><p>We recommend performing a data export beforehand.</p>',
			category: 'privacy',
			order: 98,
			language: isDE ? 'de' : 'en',
			tags: isDE
				? ['konto', 'löschen', 'daten', 'entfernen']
				: ['account', 'delete', 'data', 'remove'],
		},
	];
}
