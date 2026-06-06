/**
 * Feedback Service — Public-Community-Hub backend.
 *
 * Public reads are anonymous: callers receive the persistent pseudonym
 * (display_name) but never the underlying userId. Writes (create / react /
 * delete) require auth at the route layer; the service trusts the
 * userId argument.
 *
 * Reactions follow the Slack pattern: a user can stack multiple emojis
 * on the same item. Aggregated counts are mirrored to
 * `user_feedback.reactions` so the public feed sorts on a cached score
 * column.
 */

import { eq, and, desc, sql, isNull, gte, inArray } from 'drizzle-orm';
import {
	userFeedback,
	feedbackReactions,
	feedbackGrantLog,
	feedbackNotifications,
} from '../db/schema/feedback';
import { authUsers } from '../db/schema/auth-users';
import type { Database } from '../db/connection';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { createDisplayHash, generateDisplayName } from '../lib/pseudonym';

/**
 * Reward amounts (community-credit grants). Lives next to the policy
 * so it's obvious in code review. Tweak here, no DB migration needed.
 */
const REWARD = {
	submit: 5,
	shipped: 500,
	reactionMatch: 25,
} as const;

/** Min chars before a submit qualifies for the +5 bonus (anti-junk). */
const MIN_SUBMIT_CHARS_FOR_BONUS = 20;

/** Max grants per user per 24h (sliding window via feedback_grant_log). */
const MAX_GRANTS_PER_24H = 10;

/** Reactioner-bonus is only paid for these "I want this"-emojis, not 🤔. */
const SHIP_BONUS_REACTION_EMOJIS = ['👍', '🚀'] as const;

/**
 * Allowed reaction emojis with sort-score weights.
 * Add a new emoji here to make it submittable.
 */
const REACTION_WEIGHTS: Record<string, number> = {
	'👍': 1,
	'❤️': 1,
	'🚀': 2,
	'🤔': 0,
	'🎉': 1,
};

const ALLOWED_EMOJIS = Object.keys(REACTION_WEIGHTS);

export type PublicFeedbackItem = {
	id: string;
	appId: string;
	title: string | null;
	feedbackText: string;
	category: string;
	status: string;
	moduleContext: string | null;
	parentId: string | null;
	/** Public Pseudonym ID — SHA256 of userId+secret, one-way and
	 *  safe to expose. Used for avatar generation and Eulen-Profil-URLs. */
	displayHash: string;
	displayName: string;
	reactions: Record<string, number>;
	score: number;
	adminResponse: string | null;
	createdAt: Date;
	updatedAt: Date;
	/** Author's community karma (public, drives tier-badge). */
	karma: number;
	/** Real name, only present when:
	 *  - the post-author opted in via feedbackShowRealName=true, AND
	 *  - the response is going to an authenticated caller (the
	 *    anonymous /public endpoint always strips this).
	 */
	realName?: string;
};

type FeedbackRow = typeof userFeedback.$inferSelect;
type AuthUserRow = {
	name: string;
	feedbackShowRealName: boolean;
	feedbackKarma: number;
} | null;

export class FeedbackService {
	constructor(
		private db: Database,
		private llmUrl: string,
		/** Secret used to derive non-reversible per-user display hashes. */
		private pseudonymSecret: string,
		/** mana-credits internal API base, used for community grants. */
		private creditsUrl: string,
		/** Service-key for X-Service-Key header on internal calls. */
		private serviceKey: string,
		/** UserIds that should not receive +5 / +500 community grants. */
		private founderUserIds: Set<string>
	) {}

	// ── Submission ────────────────────────────────────────────────────

	async createFeedback(
		userId: string,
		data: {
			appId: string;
			feedbackText: string;
			category?: string;
			title?: string;
			isPublic?: boolean;
			moduleContext?: string;
			parentId?: string;
			deviceInfo?: Record<string, unknown>;
		}
	) {
		let title = data.title;

		// Auto-title via mana-llm only for top-level items; replies inherit
		// context from parent and don't need their own title.
		if (!title && !data.parentId && this.llmUrl) {
			try {
				title = await this.generateTitle(data.feedbackText);
			} catch {
				// Don't fall back to a feedbackText prefix — it just duplicates
				// the body in the UI. Leave title null; the card renders the
				// text on its own.
				title = undefined;
			}
		}

		// If the auto-titler returned something that's effectively the same
		// as the body (prefix match modulo whitespace + ellipsis), drop it.
		if (title && isRedundantTitle(title, data.feedbackText)) {
			title = undefined;
		}

		const displayHash = createDisplayHash(userId, this.pseudonymSecret);
		const displayName = generateDisplayName(displayHash);

		const [feedback] = await this.db
			.insert(userFeedback)
			.values({
				userId,
				appId: data.appId,
				title: title ?? null,
				feedbackText: data.feedbackText,
				category: (data.category as any) || 'other',
				...(typeof data.isPublic === 'boolean' ? { isPublic: data.isPublic } : {}),
				moduleContext: data.moduleContext ?? null,
				parentId: data.parentId ?? null,
				displayHash,
				displayName,
				deviceInfo: data.deviceInfo,
			})
			.returning();

		// Fire-and-forget reward grant. Failure must not block the
		// submission — credits service is non-critical for the user
		// flow. Replies (parentId set) skip the bonus to avoid
		// rewarding chatter; only top-level wishes count.
		if (!data.parentId) {
			void this.tryGrantSubmitBonus(feedback);
		}

		return feedback;
	}

	private async tryGrantSubmitBonus(feedback: typeof userFeedback.$inferSelect): Promise<void> {
		try {
			if (this.founderUserIds.has(feedback.userId)) return;
			if (feedback.feedbackText.trim().length < MIN_SUBMIT_CHARS_FOR_BONUS) return;
			if (await this.exceedsGrantRateLimit(feedback.userId)) return;

			await this.grantCredits({
				userId: feedback.userId,
				amount: REWARD.submit,
				reason: 'feedback_submit',
				referenceId: feedback.id,
				description: `Danke für dein Feedback (${feedback.category})`,
			});
		} catch (err) {
			console.warn('[feedback] submit bonus failed (non-blocking):', err);
		}
	}

	private async exceedsGrantRateLimit(userId: string): Promise<boolean> {
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const rows = await this.db
			.select({ ct: sql<number>`count(*)::int` })
			.from(feedbackGrantLog)
			.where(and(eq(feedbackGrantLog.userId, userId), gte(feedbackGrantLog.grantedAt, since)));
		return (rows[0]?.ct ?? 0) >= MAX_GRANTS_PER_24H;
	}

	private async grantCredits(args: {
		userId: string;
		amount: number;
		reason: string;
		referenceId: string;
		description?: string;
	}): Promise<void> {
		const res = await fetch(`${this.creditsUrl}/api/v1/internal/credits/grant`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Service-Key': this.serviceKey,
			},
			body: JSON.stringify(args),
		});
		if (!res.ok) {
			throw new Error(`grant failed (${res.status}): ${await res.text().catch(() => '')}`);
		}
		const body = (await res.json()) as { alreadyGranted?: boolean };
		// Only count fresh grants against the rate limit. Idempotent
		// re-tries (alreadyGranted=true) shouldn't burn the budget.
		if (!body.alreadyGranted) {
			await this.db.insert(feedbackGrantLog).values({ userId: args.userId, reason: args.reason });
		}
	}

	// ── Public reads (no auth) ────────────────────────────────────────

	/**
	 * Public feed: top-level items only (parent_id IS NULL), is_public=true.
	 * Sorted by cached score desc, then recency. Output is redacted —
	 * userId / displayHash / deviceInfo never leave the service.
	 */
	async getPublicFeed(
		opts: {
			appId?: string;
			moduleContext?: string;
			category?: string;
			status?: string;
			limit?: number;
			offset?: number;
			includeRealName?: boolean;
		} = {}
	): Promise<PublicFeedbackItem[]> {
		const {
			appId,
			moduleContext,
			category,
			status,
			limit = 50,
			offset = 0,
			includeRealName = false,
		} = opts;

		const conditions = [eq(userFeedback.isPublic, true), isNull(userFeedback.parentId)];
		if (appId) conditions.push(eq(userFeedback.appId, appId));
		if (moduleContext) conditions.push(eq(userFeedback.moduleContext, moduleContext));
		if (category) conditions.push(eq(userFeedback.category, category as any));
		if (status) conditions.push(eq(userFeedback.status, status as any));

		const rows = await this.db
			.select({ feedback: userFeedback, author: this.authorSelection() })
			.from(userFeedback)
			.leftJoin(authUsers, eq(authUsers.id, userFeedback.userId))
			.where(and(...conditions))
			.orderBy(desc(userFeedback.score), desc(userFeedback.createdAt))
			.limit(limit)
			.offset(offset);

		return rows.map((r) => redact(r.feedback, r.author, { includeRealName }));
	}

	/** Replies for a single parent item (1-level threading). */
	async getReplies(
		parentId: string,
		opts: { includeRealName?: boolean } = {}
	): Promise<PublicFeedbackItem[]> {
		const rows = await this.db
			.select({ feedback: userFeedback, author: this.authorSelection() })
			.from(userFeedback)
			.leftJoin(authUsers, eq(authUsers.id, userFeedback.userId))
			.where(and(eq(userFeedback.parentId, parentId), eq(userFeedback.isPublic, true)))
			.orderBy(userFeedback.createdAt);
		return rows.map((r) =>
			redact(r.feedback, r.author, { includeRealName: opts.includeRealName ?? false })
		);
	}

	/**
	 * Public Eulen-Profil — alle public-Posts unter dem display_hash plus
	 * aggregierte Karma vom Author. Liefert auch ein leeres Array (kein
	 * Throw), wenn der Hash nirgends auftaucht; das macht das Frontend
	 * easier (keine 404-Race auf dynamic IDs).
	 */
	async getEulenProfile(displayHash: string): Promise<{
		displayHash: string;
		displayName: string | null;
		karma: number;
		items: PublicFeedbackItem[];
	}> {
		const rows = await this.db
			.select({ feedback: userFeedback, author: this.authorSelection() })
			.from(userFeedback)
			.leftJoin(authUsers, eq(authUsers.id, userFeedback.userId))
			.where(and(eq(userFeedback.displayHash, displayHash), eq(userFeedback.isPublic, true)))
			.orderBy(desc(userFeedback.createdAt))
			.limit(200);

		const items = rows.map((r) => redact(r.feedback, r.author, { includeRealName: false }));
		const displayName = items[0]?.displayName ?? null;
		const karma = rows[0]?.author?.feedbackKarma ?? 0;

		return { displayHash, displayName, karma, items };
	}

	/** Single public item by id. Returns null if not found / not public. */
	async getPublicItem(
		id: string,
		opts: { includeRealName?: boolean } = {}
	): Promise<PublicFeedbackItem | null> {
		const [row] = await this.db
			.select({ feedback: userFeedback, author: this.authorSelection() })
			.from(userFeedback)
			.leftJoin(authUsers, eq(authUsers.id, userFeedback.userId))
			.where(and(eq(userFeedback.id, id), eq(userFeedback.isPublic, true)))
			.limit(1);
		return row
			? redact(row.feedback, row.author, { includeRealName: opts.includeRealName ?? false })
			: null;
	}

	/** Selection helper — picks the auth-user columns we need. Drizzle
	 *  treats the missing-author case (deleted user, FK orphan) as null. */
	private authorSelection() {
		return {
			name: authUsers.name,
			feedbackShowRealName: authUsers.feedbackShowRealName,
			feedbackKarma: authUsers.feedbackKarma,
		};
	}

	// ── Authenticated reads ───────────────────────────────────────────

	/** Items the user has authored (across all isPublic states). */
	async getMyFeedback(userId: string) {
		return this.db
			.select()
			.from(userFeedback)
			.where(eq(userFeedback.userId, userId))
			.orderBy(desc(userFeedback.createdAt));
	}

	/**
	 * Items the user has reacted to (any emoji), with their current
	 * status — feeds the /profile/my-wishes "what you supported" tab so
	 * users can watch wishes they cared about move through the pipeline.
	 * Excludes the user's own posts (those are in getMyFeedback).
	 */
	async getMyReactedItems(userId: string, limit = 100): Promise<PublicFeedbackItem[]> {
		const rows = await this.db
			.selectDistinct({ feedback: userFeedback, author: this.authorSelection() })
			.from(feedbackReactions)
			.innerJoin(userFeedback, eq(feedbackReactions.feedbackId, userFeedback.id))
			.leftJoin(authUsers, eq(authUsers.id, userFeedback.userId))
			.where(
				and(
					eq(feedbackReactions.userId, userId),
					sql`${userFeedback.userId} <> ${userId}`,
					eq(userFeedback.isPublic, true)
				)
			)
			.orderBy(desc(userFeedback.updatedAt))
			.limit(limit);

		return rows.map((r) => redact(r.feedback, r.author, { includeRealName: true }));
	}

	/** Map of emoji → boolean for the requesting user on a feedback item. */
	async getMyReactionsFor(feedbackId: string, userId: string): Promise<string[]> {
		const rows = await this.db
			.select({ emoji: feedbackReactions.emoji })
			.from(feedbackReactions)
			.where(
				and(eq(feedbackReactions.feedbackId, feedbackId), eq(feedbackReactions.userId, userId))
			);
		return rows.map((r) => r.emoji);
	}

	// ── Reactions ─────────────────────────────────────────────────────

	/**
	 * Toggle a single emoji reaction for (feedbackId, userId).
	 * Returns the updated reaction-counter map and score.
	 */
	async toggleReaction(
		feedbackId: string,
		userId: string,
		emoji: string
	): Promise<{ reactions: Record<string, number>; score: number; userHasReacted: boolean }> {
		if (!ALLOWED_EMOJIS.includes(emoji)) {
			throw new BadRequestError(`Unsupported emoji: ${emoji}`);
		}

		// Ensure target item exists + grab the author for karma tracking.
		const [item] = await this.db
			.select({ id: userFeedback.id, authorId: userFeedback.userId })
			.from(userFeedback)
			.where(eq(userFeedback.id, feedbackId))
			.limit(1);
		if (!item) throw new NotFoundError('Feedback not found');

		// Karma is per-react (not per-author-per-user). Self-reactions
		// don't count — that would be self-promotion. Founder users also
		// don't farm karma off each other since they tend to react on
		// their own things; the author check below handles both cases.
		const counts = item.authorId !== userId;

		// Try to insert (react). If conflicting → user already reacted, so unreact.
		const inserted = await this.db
			.insert(feedbackReactions)
			.values({ feedbackId, userId, emoji })
			.onConflictDoNothing()
			.returning();

		let userHasReacted: boolean;
		if (inserted.length === 0) {
			// Already reacted → remove the row (unreact).
			await this.db
				.delete(feedbackReactions)
				.where(
					and(
						eq(feedbackReactions.feedbackId, feedbackId),
						eq(feedbackReactions.userId, userId),
						eq(feedbackReactions.emoji, emoji)
					)
				);
			userHasReacted = false;
		} else {
			userHasReacted = true;
		}

		// Author karma: +1 on react, -1 on unreact (per emoji-toggle).
		// Skipped when the reactor is the author themselves so people
		// can't farm karma off their own posts. Floor-clamped at 0 so
		// edge-cases (e.g. author deletes the row externally) don't go
		// negative.
		if (counts && item.authorId) {
			const delta = userHasReacted ? 1 : -1;
			await this.db
				.update(authUsers)
				.set({
					feedbackKarma: sql`GREATEST(${authUsers.feedbackKarma} + ${delta}, 0)`,
				})
				.where(eq(authUsers.id, item.authorId));
		}

		// Recompute aggregated reactions + score for this item.
		const aggregated = await this.recomputeReactions(feedbackId);
		return { ...aggregated, userHasReacted };
	}

	/** Recomputes user_feedback.reactions + score from feedback_reactions. */
	private async recomputeReactions(
		feedbackId: string
	): Promise<{ reactions: Record<string, number>; score: number }> {
		const rows = await this.db
			.select({ emoji: feedbackReactions.emoji, count: sql<number>`count(*)::int` })
			.from(feedbackReactions)
			.where(eq(feedbackReactions.feedbackId, feedbackId))
			.groupBy(feedbackReactions.emoji);

		const reactions: Record<string, number> = {};
		let score = 0;
		for (const row of rows) {
			reactions[row.emoji] = row.count;
			score += (REACTION_WEIGHTS[row.emoji] ?? 0) * row.count;
		}

		await this.db
			.update(userFeedback)
			.set({ reactions, score, updatedAt: new Date() })
			.where(eq(userFeedback.id, feedbackId));

		return { reactions, score };
	}

	// ── Mutations ─────────────────────────────────────────────────────

	async deleteFeedback(feedbackId: string, userId: string) {
		const result = await this.db
			.delete(userFeedback)
			.where(and(eq(userFeedback.id, feedbackId), eq(userFeedback.userId, userId)))
			.returning();
		if (result.length === 0) throw new NotFoundError('Feedback not found');
		return { success: true };
	}

	// ── Admin (founder-tier-gated at route layer) ─────────────────────

	async adminListAll(
		opts: {
			appId?: string;
			category?: string;
			status?: string;
			moduleContext?: string;
			limit?: number;
			offset?: number;
		} = {}
	) {
		const { appId, category, status, moduleContext, limit = 100, offset = 0 } = opts;
		const conditions = [];
		if (appId) conditions.push(eq(userFeedback.appId, appId));
		if (category) conditions.push(eq(userFeedback.category, category as any));
		if (status) conditions.push(eq(userFeedback.status, status as any));
		if (moduleContext) conditions.push(eq(userFeedback.moduleContext, moduleContext));

		return this.db
			.select()
			.from(userFeedback)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(userFeedback.createdAt))
			.limit(limit)
			.offset(offset);
	}

	async adminUpdate(
		feedbackId: string,
		patch: { status?: string; adminResponse?: string; isPublic?: boolean }
	) {
		const [before] = await this.db
			.select()
			.from(userFeedback)
			.where(eq(userFeedback.id, feedbackId))
			.limit(1);
		if (!before) throw new NotFoundError('Feedback not found');

		const update: Record<string, unknown> = { updatedAt: new Date() };
		if (patch.status !== undefined) update.status = patch.status;
		if (patch.adminResponse !== undefined) update.adminResponse = patch.adminResponse;
		if (patch.isPublic !== undefined) update.isPublic = patch.isPublic;

		const [row] = await this.db
			.update(userFeedback)
			.set(update)
			.where(eq(userFeedback.id, feedbackId))
			.returning();

		// Status-Transition triggert immer eine Author-Notification, plus
		// Reactioner-Notifications + Ship-Bonus-Credits beim FRISCHEN
		// 'completed'-Übergang. Doppel-Triggering bei Status-Flapping wird
		// strukturell durch den `before.status !== row.status`-Guard
		// verhindert, plus Idempotency via referenceId in den Credit-Grants.
		const statusChanged = before.status !== row.status && patch.status !== undefined;
		const adminResponseChanged =
			patch.adminResponse !== undefined && before.adminResponse !== row.adminResponse;

		if (statusChanged) {
			void this.enqueueStatusNotifications(row, before.status);
		}
		if (adminResponseChanged && row.adminResponse) {
			void this.enqueueAdminResponseNotification(row);
		}

		// Credit-Layer hängt nur am completed-Übergang.
		if (before.status !== 'completed' && row.status === 'completed') {
			void this.tryGrantShipBonus(row);
		}

		return row;
	}

	/**
	 * Enqueue a per-user notification for the author when status changes.
	 * Reactioners-with-👍/🚀 get their own notification on 'completed'
	 * via tryGrantShipBonus (which also pays them +25). Statuses that
	 * mean "we heard you" (planned, in_progress) only notify the author.
	 */
	private async enqueueStatusNotifications(
		feedback: typeof userFeedback.$inferSelect,
		previousStatus: string
	): Promise<void> {
		try {
			const titleByStatus: Record<string, string> = {
				planned: `Geplant: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
				in_progress: `Wir bauen ›${feedback.title ?? this.shortTitle(feedback)}‹ gerade`,
				completed: `Dein Wunsch ist live: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
				declined: `Abgelehnt: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
				submitted: `Reaktiviert: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
				under_review: `Wird geprüft: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
			};

			const title = titleByStatus[feedback.status] ?? `Status: ${feedback.status}`;
			const bodyByStatus: Record<string, string | undefined> = {
				planned: 'Auf der Roadmap eingetragen.',
				in_progress: 'Wird aktiv umgesetzt — wir melden uns wenn live.',
				completed: '+500 Mana — danke für die Idee 🎉',
				declined: 'Können wir gerade nicht umsetzen. Schau in der Antwort, falls du möchtest.',
				under_review: 'Schauen wir uns gleich an.',
			};

			await this.db.insert(feedbackNotifications).values({
				userId: feedback.userId,
				feedbackId: feedback.id,
				kind: `status_${feedback.status}`,
				title,
				body: bodyByStatus[feedback.status] ?? null,
				creditsAwarded: feedback.status === 'completed' ? REWARD.shipped : 0,
			});
			void previousStatus; // reserved for future "wurde rückgesetzt"-flavored copy
		} catch (err) {
			console.warn('[feedback] enqueue status notify failed:', err);
		}
	}

	private async enqueueAdminResponseNotification(
		feedback: typeof userFeedback.$inferSelect
	): Promise<void> {
		try {
			await this.db.insert(feedbackNotifications).values({
				userId: feedback.userId,
				feedbackId: feedback.id,
				kind: 'admin_response',
				title: `Antwort vom Team: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
				body: feedback.adminResponse?.slice(0, 200) ?? null,
				creditsAwarded: 0,
			});
		} catch (err) {
			console.warn('[feedback] enqueue admin-response notify failed:', err);
		}
	}

	private shortTitle(feedback: typeof userFeedback.$inferSelect): string {
		return feedback.feedbackText.slice(0, 40) + (feedback.feedbackText.length > 40 ? '…' : '');
	}

	// ── Notifications inbox ──────────────────────────────────────────

	async getNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
		const { unreadOnly = false, limit = 50 } = opts;
		const conds = [eq(feedbackNotifications.userId, userId)];
		if (unreadOnly) conds.push(isNull(feedbackNotifications.readAt));
		return this.db
			.select()
			.from(feedbackNotifications)
			.where(and(...conds))
			.orderBy(desc(feedbackNotifications.createdAt))
			.limit(limit);
	}

	async markNotificationRead(notifId: string, userId: string): Promise<{ ok: true }> {
		await this.db
			.update(feedbackNotifications)
			.set({ readAt: new Date() })
			.where(and(eq(feedbackNotifications.id, notifId), eq(feedbackNotifications.userId, userId)));
		return { ok: true };
	}

	async markAllNotificationsRead(userId: string): Promise<{ ok: true; count: number }> {
		const result = await this.db
			.update(feedbackNotifications)
			.set({ readAt: new Date() })
			.where(and(eq(feedbackNotifications.userId, userId), isNull(feedbackNotifications.readAt)))
			.returning({ id: feedbackNotifications.id });
		return { ok: true, count: result.length };
	}

	private async tryGrantShipBonus(feedback: typeof userFeedback.$inferSelect): Promise<void> {
		try {
			// Original wisher gets the +500.
			if (!this.founderUserIds.has(feedback.userId)) {
				await this.grantCredits({
					userId: feedback.userId,
					amount: REWARD.shipped,
					reason: 'feedback_shipped',
					referenceId: `${feedback.id}_shipped`,
					description: `Dein Wunsch ›${feedback.title ?? feedback.feedbackText.slice(0, 40)}‹ ist live`,
				});
			}

			// Reactioners who pushed for this with 👍 or 🚀 each get +25.
			const reactionRows = await this.db
				.select({ userId: feedbackReactions.userId, emoji: feedbackReactions.emoji })
				.from(feedbackReactions)
				.where(
					and(
						eq(feedbackReactions.feedbackId, feedback.id),
						inArray(feedbackReactions.emoji, [...SHIP_BONUS_REACTION_EMOJIS])
					)
				);

			// One reward per user even if they reacted with multiple emojis.
			const supporters = new Set<string>();
			for (const r of reactionRows) supporters.add(r.userId);
			supporters.delete(feedback.userId); // author already got the big bonus
			for (const fid of this.founderUserIds) supporters.delete(fid);

			for (const supporter of supporters) {
				try {
					await this.grantCredits({
						userId: supporter,
						amount: REWARD.reactionMatch,
						reason: 'feedback_reaction_match',
						referenceId: `${feedback.id}_reaction_${supporter}`,
						description: `Du hast ›${feedback.title ?? '(Wunsch)'}‹ unterstützt — danke!`,
					});

					// Inbox-Notify zusätzlich zur Credit-Auszahlung — sonst sieht
					// der Reactioner zwar Credits in seiner History, aber weiß
					// nicht warum.
					await this.db.insert(feedbackNotifications).values({
						userId: supporter,
						feedbackId: feedback.id,
						kind: 'reactioner_bonus',
						title: `Dein Like ist gelandet: ›${feedback.title ?? this.shortTitle(feedback)}‹`,
						body: '+25 Mana — der Wunsch, den du unterstützt hast, ist live.',
						creditsAwarded: REWARD.reactionMatch,
					});
				} catch (err) {
					console.warn('[feedback] reactioner-bonus failed for', supporter, err);
				}
			}
		} catch (err) {
			console.warn('[feedback] ship bonus failed (non-blocking):', err);
		}
	}

	// ── LLM helpers ───────────────────────────────────────────────────

	private async generateTitle(text: string): Promise<string> {
		const res = await fetch(`${this.llmUrl}/api/v1/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'system',
						content:
							'Generate a short title (max 80 chars) for this feedback. Reply with only the title.',
					},
					{ role: 'user', content: text },
				],
				model: 'gemma4:12b',
				max_tokens: 50,
			}),
		});
		if (!res.ok) throw new Error('LLM failed');
		const data = await res.json();
		return data.choices?.[0]?.message?.content?.trim() || text.slice(0, 80);
	}
}

/**
 * True if the title is just a truncated/prefixed version of the body
 * — i.e. would render twice in the card. Compares whitespace-collapsed
 * lowercase forms, ignoring trailing ellipsis on either side.
 */
function isRedundantTitle(title: string, body: string): boolean {
	const norm = (s: string) =>
		s
			.toLowerCase()
			.replace(/[…\.]+$/u, '')
			.replace(/\s+/g, ' ')
			.trim();
	const t = norm(title);
	const b = norm(body);
	if (!t || !b) return false;
	return b === t || b.startsWith(t) || t.startsWith(b);
}

/** Strips userId / displayHash / deviceInfo from a row. */
function redact(
	row: FeedbackRow,
	author: AuthUserRow = null,
	options: { includeRealName?: boolean } = {}
): PublicFeedbackItem {
	const includeReal = options.includeRealName ?? false;
	const item: PublicFeedbackItem = {
		id: row.id,
		appId: row.appId,
		title: row.title,
		feedbackText: row.feedbackText,
		category: row.category,
		status: row.status,
		moduleContext: row.moduleContext,
		parentId: row.parentId,
		// displayHash is the public Pseudonym-ID. One-way (SHA256 of
		// userId+secret), safe to expose; userId itself never leaves.
		displayHash: row.displayHash ?? '',
		displayName: row.displayName ?? 'Anonym',
		reactions: (row.reactions as Record<string, number>) ?? {},
		score: row.score,
		adminResponse: row.adminResponse,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		karma: author?.feedbackKarma ?? 0,
	};
	if (includeReal && author?.feedbackShowRealName && author.name) {
		item.realName = author.name;
	}
	return item;
}

export { ALLOWED_EMOJIS, REACTION_WEIGHTS, REWARD };
// Test-only exports — used by privacy-boundary tests to verify the
// anonymous public path NEVER includes realName even when the user
// opted in. Still safe to expose since redact is a pure-function.
export const __TEST__ = { redact };
