/**
 * Mood module types — multi-daily mood tracking with emotions, context, and patterns.
 *
 * Tables:
 *   moodEntries  — individual mood check-ins (multiple per day)
 *   moodSettings — singleton preferences
 */

import type { BaseRecord } from '@mana/local-store';

// ─── Enums / unions ─────────────────────────────────────────

/**
 * Core emotions loosely based on Plutchik's wheel, simplified for quick selection.
 * 8 primary emotions, each with a valence (positive/negative/neutral).
 */
export type CoreEmotion =
	| 'happy'
	| 'calm'
	| 'energized'
	| 'grateful'
	| 'sad'
	| 'anxious'
	| 'angry'
	| 'tired'
	| 'stressed'
	| 'bored'
	| 'excited'
	| 'loved'
	| 'frustrated'
	| 'hopeful'
	| 'overwhelmed'
	| 'neutral';

/** What the user is doing when logging. */
export type ActivityContext =
	| 'work'
	| 'exercise'
	| 'social'
	| 'alone'
	| 'commute'
	| 'eating'
	| 'resting'
	| 'creative'
	| 'outdoors'
	| 'screen'
	| 'chores'
	| 'other';

// ─── Local Record Types (Dexie) ─────────────────────────────

export interface LocalMoodEntry extends BaseRecord {
	/** YYYY-MM-DD */
	date: string;
	/** HH:mm of the check-in */
	time: string;
	/** Overall energy/mood level 1–10 */
	level: number;
	/** Primary emotion */
	emotion: CoreEmotion;
	/** Optional secondary emotions */
	secondaryEmotions: CoreEmotion[];
	/** What are you doing? */
	activity: ActivityContext | null;
	/** Who are you with? (free text) */
	withWhom: string;
	/** Free-text note */
	notes: string;
	/** Tags for quick categorization */
	tags: string[];
}

export interface LocalMoodSettings extends BaseRecord {
	/** How many check-ins per day are suggested (default: 3) */
	dailyTarget: number;
	/** Reminder times HH:mm[] */
	reminderTimes: string[];
	/** Whether reminders are active */
	remindersEnabled: boolean;
}

// ─── Domain Types (UI-facing) ───────────────────────────────

export interface MoodEntry {
	id: string;
	date: string;
	time: string;
	level: number;
	emotion: CoreEmotion;
	secondaryEmotions: CoreEmotion[];
	activity: ActivityContext | null;
	withWhom: string;
	notes: string;
	tags: string[];
	createdAt: string;
}

export interface MoodSettings {
	id: string;
	dailyTarget: number;
	reminderTimes: string[];
	remindersEnabled: boolean;
}

// ─── Constants ──────────────────────────────────────────────

export const EMOTION_META: Record<
	CoreEmotion,
	{
		de: string;
		en: string;
		emoji: string;
		valence: 'positive' | 'negative' | 'neutral';
		color: string;
	}
> = {
	happy: { de: 'Fröhlich', en: 'Happy', emoji: '😊', valence: 'positive', color: '#f59e0b' },
	calm: { de: 'Ruhig', en: 'Calm', emoji: '😌', valence: 'positive', color: '#06b6d4' },
	energized: {
		de: 'Energiegeladen',
		en: 'Energized',
		emoji: '⚡',
		valence: 'positive',
		color: '#f97316',
	},
	grateful: { de: 'Dankbar', en: 'Grateful', emoji: '🙏', valence: 'positive', color: '#ec4899' },
	excited: { de: 'Aufgeregt', en: 'Excited', emoji: '🤩', valence: 'positive', color: '#ef4444' },
	loved: { de: 'Geliebt', en: 'Loved', emoji: '🥰', valence: 'positive', color: '#f43f5e' },
	hopeful: {
		de: 'Hoffnungsvoll',
		en: 'Hopeful',
		emoji: '🌱',
		valence: 'positive',
		color: '#22c55e',
	},
	neutral: { de: 'Neutral', en: 'Neutral', emoji: '😐', valence: 'neutral', color: '#6b7280' },
	bored: { de: 'Gelangweilt', en: 'Bored', emoji: '😑', valence: 'neutral', color: '#9ca3af' },
	tired: { de: 'Müde', en: 'Tired', emoji: '😴', valence: 'negative', color: '#8b5cf6' },
	sad: { de: 'Traurig', en: 'Sad', emoji: '😢', valence: 'negative', color: '#3b82f6' },
	anxious: { de: 'Ängstlich', en: 'Anxious', emoji: '😰', valence: 'negative', color: '#a855f7' },
	angry: { de: 'Wütend', en: 'Angry', emoji: '😡', valence: 'negative', color: '#dc2626' },
	stressed: { de: 'Gestresst', en: 'Stressed', emoji: '😤', valence: 'negative', color: '#ea580c' },
	frustrated: {
		de: 'Frustriert',
		en: 'Frustrated',
		emoji: '😣',
		valence: 'negative',
		color: '#b91c1c',
	},
	overwhelmed: {
		de: 'Überfordert',
		en: 'Overwhelmed',
		emoji: '🤯',
		valence: 'negative',
		color: '#7c3aed',
	},
};

export const CORE_EMOTIONS: readonly CoreEmotion[] = [
	'happy',
	'calm',
	'energized',
	'grateful',
	'excited',
	'loved',
	'hopeful',
	'neutral',
	'bored',
	'tired',
	'sad',
	'anxious',
	'angry',
	'stressed',
	'frustrated',
	'overwhelmed',
] as const;

export const ACTIVITY_LABELS: Record<ActivityContext, { de: string; en: string; emoji: string }> = {
	work: { de: 'Arbeit', en: 'Work', emoji: '💼' },
	exercise: { de: 'Sport', en: 'Exercise', emoji: '🏃' },
	social: { de: 'Sozial', en: 'Social', emoji: '👥' },
	alone: { de: 'Allein', en: 'Alone', emoji: '🧘' },
	commute: { de: 'Unterwegs', en: 'Commute', emoji: '🚶' },
	eating: { de: 'Essen', en: 'Eating', emoji: '🍽️' },
	resting: { de: 'Ruhen', en: 'Resting', emoji: '🛋️' },
	creative: { de: 'Kreativ', en: 'Creative', emoji: '🎨' },
	outdoors: { de: 'Draußen', en: 'Outdoors', emoji: '🌳' },
	screen: { de: 'Bildschirm', en: 'Screen', emoji: '📱' },
	chores: { de: 'Haushalt', en: 'Chores', emoji: '🧹' },
	other: { de: 'Sonstiges', en: 'Other', emoji: '📌' },
};

export const MOOD_TAG_PRESETS = [
	'Kaffee',
	'Sport',
	'Meditation',
	'Schlecht geschlafen',
	'Gut geschlafen',
	'Natur',
	'Musik',
	'Streit',
	'Erfolg',
	'Deadline',
	'Wochenende',
	'Regen',
	'Sonne',
	'Kopfschmerzen',
	'Periode',
] as const;

export const DEFAULT_MOOD_SETTINGS: Omit<LocalMoodSettings, keyof BaseRecord> = {
	dailyTarget: 3,
	reminderTimes: ['09:00', '14:00', '20:00'],
	remindersEnabled: false,
};
