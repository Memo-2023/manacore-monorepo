/**
 * Traces module — GPS sync + AI city guides
 * Ported from apps/traces/apps/server
 *
 * CRUD for locations, cities, places, POIs handled by mana-sync.
 * This module handles AI guide generation and location sync with city detection.
 */

import { Hono } from 'hono';
import { logger, type AuthVariables } from '@mana/shared-hono';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { getConnection } from '../../lib/db';
import {
	pgSchema,
	uuid,
	text,
	doublePrecision,
	timestamp,
	integer,
	pgEnum,
} from 'drizzle-orm/pg-core';

// ─── DB Schema ──────────────────────────────────────────────

const LLM_URL = process.env.MANA_LLM_URL || 'http://localhost:3025';

const tracesSchema = pgSchema('traces');

const locationSourceEnum = pgEnum('location_source', [
	'foreground',
	'background',
	'manual',
	'photo-import',
]);

const guideStatusEnum = pgEnum('guide_status', ['generating', 'ready', 'error']);

const poiCategoryEnum = pgEnum('poi_category', [
	'building',
	'monument',
	'church',
	'museum',
	'palace',
	'bridge',
	'park',
	'square',
	'sculpture',
	'fountain',
	'historic_site',
	'other',
]);

const locations = tracesSchema.table('locations', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: text('user_id').notNull(),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	accuracy: doublePrecision('accuracy'),
	altitude: doublePrecision('altitude'),
	speed: doublePrecision('speed'),
	source: locationSourceEnum('source').default('foreground'),
	addressFormatted: text('address_formatted'),
	city: text('city'),
	country: text('country'),
	countryCode: text('country_code'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

const cities = tracesSchema.table('cities', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	country: text('country').notNull(),
	countryCode: text('country_code').notNull(),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

const pois = tracesSchema.table('pois', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	category: poiCategoryEnum('category').default('other').notNull(),
	cityId: uuid('city_id').notNull(),
	aiSummary: text('ai_summary'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

const guides = tracesSchema.table('guides', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: text('user_id').notNull(),
	cityId: uuid('city_id').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	status: guideStatusEnum('status').default('generating').notNull(),
	estimatedDurationMin: integer('estimated_duration_min'),
	language: text('language').default('de').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

const guidePois = tracesSchema.table('guide_pois', {
	id: uuid('id').defaultRandom().primaryKey(),
	guideId: uuid('guide_id').notNull(),
	poiId: uuid('poi_id').notNull(),
	sortOrder: integer('sort_order').notNull(),
	aiNarrative: text('ai_narrative'),
	narrativeLanguage: text('narrative_language').default('de'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

const db = drizzle(getConnection(), { schema: { locations, cities, pois, guides, guidePois } });

// ─── Routes ─────────────────────────────────────────────────

const routes = new Hono<{ Variables: AuthVariables }>();

// ─── Guide Generation (server-only: AI + search) ────────────

routes.post('/guides/generate', async (c) => {
	const userId = c.get('userId');
	const params = await c.req.json<{
		cityId: string;
		title: string;
		language?: string;
		maxPois?: number;
	}>();

	// Get city
	const [city] = await db.select().from(cities).where(eq(cities.id, params.cityId)).limit(1);
	if (!city) return c.json({ error: 'City not found' }, 404);

	// Create guide in 'generating' state
	const [guide] = await db
		.insert(guides)
		.values({
			userId,
			cityId: params.cityId,
			title: params.title || `Guide: ${city.name}`,
			status: 'generating',
			language: params.language || 'de',
		})
		.returning();

	// Fire-and-forget async pipeline
	runGuidePipeline(guide.id, userId, city, params.language || 'de', params.maxPois || 10).catch(
		(err) => {
			logger.error('traces.guide_generation_failed', {
				guideId: guide.id,
				cityId: city.id,
				error: err instanceof Error ? err.message : String(err),
			});
			db.update(guides)
				.set({ status: 'error' })
				.where(eq(guides.id, guide.id))
				.catch(() => {});
		}
	);

	return c.json(guide, 201);
});

routes.get('/guides', async (c) => {
	const userId = c.get('userId');
	return c.json(await db.select().from(guides).where(eq(guides.userId, userId)));
});

routes.get('/guides/:id', async (c) => {
	const userId = c.get('userId');
	const guideId = c.req.param('id');

	const [guide] = await db
		.select()
		.from(guides)
		.where(and(eq(guides.id, guideId), eq(guides.userId, userId)))
		.limit(1);

	if (!guide) return c.json({ error: 'Not found' }, 404);

	const waypoints = await db
		.select()
		.from(guidePois)
		.innerJoin(pois, eq(guidePois.poiId, pois.id))
		.where(eq(guidePois.guideId, guideId))
		.orderBy(guidePois.sortOrder);

	return c.json({ ...guide, waypoints });
});

routes.delete('/guides/:id', async (c) => {
	const userId = c.get('userId');
	await db.delete(guides).where(and(eq(guides.id, c.req.param('id')), eq(guides.userId, userId)));
	return c.json({ success: true });
});

// ─── Location Sync (server-only: city detection) ────────────

routes.post('/locations/sync', async (c) => {
	const userId = c.get('userId');
	const { items } = await c.req.json();

	let synced = 0;
	for (const item of items || []) {
		try {
			await db
				.insert(locations)
				.values({
					userId,
					latitude: item.latitude,
					longitude: item.longitude,
					recordedAt: new Date(item.recordedAt),
					accuracy: item.accuracy,
					altitude: item.altitude,
					speed: item.speed,
					source: item.source || 'foreground',
					addressFormatted: item.address,
					city: item.city,
					country: item.country,
					countryCode: item.countryCode,
				})
				.onConflictDoNothing();
			synced++;
		} catch {
			// Skip duplicates
		}
	}

	return c.json({ synced, total: items?.length || 0 });
});

// ─── Internal: Guide Pipeline ───────────────────────────────

async function runGuidePipeline(
	guideId: string,
	userId: string,
	city: { id: string; name: string },
	language: string,
	maxPois: number
) {
	// 1. Find nearby POIs
	const nearbyPois = await db.select().from(pois).where(eq(pois.cityId, city.id)).limit(maxPois);

	if (nearbyPois.length === 0) {
		await db.update(guides).set({ status: 'ready' }).where(eq(guides.id, guideId));
		return;
	}

	// 2. Generate AI narratives for each POI
	for (let i = 0; i < nearbyPois.length; i++) {
		const poi = nearbyPois[i];
		let narrative = poi.aiSummary || '';

		if (!narrative) {
			try {
				const res = await fetch(`${LLM_URL}/api/v1/chat/completions`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [
							{
								role: 'system',
								content: `Du bist ein Stadtführer in ${city.name}. Schreibe einen kurzen, informativen Text (max 200 Wörter) über die Sehenswürdigkeit. Sprache: ${language === 'de' ? 'Deutsch' : 'English'}.`,
							},
							{ role: 'user', content: `Erzähle mir über: ${poi.name}` },
						],
						model: 'gemma4:12b',
						max_tokens: 300,
					}),
				});

				if (res.ok) {
					const data = await res.json();
					narrative = data.choices?.[0]?.message?.content?.trim() || poi.name;
				} else {
					narrative = poi.description || poi.name;
				}
			} catch {
				narrative = poi.description || poi.name;
			}
		}

		await db.insert(guidePois).values({
			guideId,
			poiId: poi.id,
			sortOrder: i,
			aiNarrative: narrative,
			narrativeLanguage: language,
		});
	}

	// 3. Mark as ready
	await db
		.update(guides)
		.set({
			status: 'ready',
			estimatedDurationMin: nearbyPois.length * 15,
		})
		.where(eq(guides.id, guideId));
}

export { routes as tracesRoutes };
