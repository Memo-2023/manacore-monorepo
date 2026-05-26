import { defineCollection, z } from 'astro:content';

const appsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		category: z.enum([
			'productivity',
			'ai-tools',
			'creative',
			'communication',
			'analytics',
			'wellness',
		]),
		icon: z.string(),
		manaUsage: z.object({
			min: z.number(),
			average: z.number(),
			max: z.number(),
			unit: z.enum(['per-action', 'per-minute', 'per-request', 'per-image', 'per-token']),
		}),
		features: z.array(z.string()),
		status: z.enum(['available', 'coming-soon', 'beta']),
		order: z.number(),
		website: z.string().optional(),
		screenshots: z.array(z.string()).optional(),
	}),
});

const targetGroupsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		icon: z.string(),
		benefits: z.array(z.string()),
		useCases: z.array(z.string()),
		testimonial: z
			.object({
				quote: z.string(),
				author: z.string(),
				role: z.string(),
				company: z.string().optional(),
			})
			.optional(),
		pricing: z.object({
			special: z.boolean(),
			discount: z.string().optional(),
			details: z.string(),
		}),
		order: z.number(),
	}),
});

const legalCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		lastUpdated: z.date(),
		order: z.number(),
		sections: z
			.array(
				z.object({
					heading: z.string(),
					content: z.string(),
				})
			)
			.optional(),
	}),
});

const privacyCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		category: z.enum(['compliance', 'security', 'ai-ethics', 'transparency']),
		lastUpdated: z.date(),
		order: z.number(),
		featured: z.boolean().default(false),
		tags: z.array(z.string()).optional(),
	}),
});

const clientsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		company: z.string(),
		logo: z.string(),
		industry: z.string(),
		size: z.enum(['startup', 'mittelstand', 'enterprise']),
		location: z.string(),
		testimonial: z.object({
			quote: z.string(),
			author: z.string(),
			role: z.string(),
			image: z.string().optional(),
		}),
		stats: z.array(
			z.object({
				value: z.string(),
				label: z.string(),
			})
		),
		challenge: z.string(),
		solution: z.string(),
		results: z.array(z.string()),
		manaUsage: z.object({
			monthlyCredits: z.number(),
			mainTools: z.array(z.string()),
			teamSize: z.number(),
		}),
		featured: z.boolean().default(false),
		order: z.number(),
	}),
});

const missionCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		category: z.enum(['vision', 'values', 'approach', 'team', 'future']),
		image: z.string().optional(),
		order: z.number(),
		featured: z.boolean().default(false),
		lang: z.enum(['de', 'en', 'it']).default('de'),
	}),
});

const contextCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		order: z.number(),
		icon: z.string().optional(),
		publishedAt: z.date().optional(),
		updatedAt: z.date().optional(),
	}),
});

const devlogCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.date(),
		author: z.string().default('Till Schneider'),
		category: z.enum(['release', 'infrastructure', 'feature', 'bugfix', 'update']),
		tags: z.array(z.string()).optional(),
		featured: z.boolean().default(false),
		commits: z.number().optional(),
		readTime: z.number().optional(),
		// Extended stats for activity grid
		stats: z
			.object({
				filesChanged: z.number(),
				linesAdded: z.number(),
				linesRemoved: z.number(),
			})
			.optional(),
		contributors: z
			.array(
				z.object({
					name: z.string(),
					handle: z.string().optional(),
					commits: z.number().optional(),
				})
			)
			.optional(),
		// Working hours (11:00 to 11:00 next day convention)
		workingHours: z
			.object({
				start: z.string(), // e.g., "2026-01-30T11:00"
				end: z.string(), // e.g., "2026-01-31T11:00"
			})
			.optional(),
	}),
});

const manascoreCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.date(),
		app: z.string(),
		author: z.string().default('Till Schneider'),
		tags: z.array(z.string()).optional(),
		// Overall score (0-100)
		score: z.number().min(0).max(100),
		// Category scores (0-100)
		scores: z.object({
			backend: z.number().min(0).max(100),
			frontend: z.number().min(0).max(100),
			database: z.number().min(0).max(100),
			testing: z.number().min(0).max(100),
			deployment: z.number().min(0).max(100),
			documentation: z.number().min(0).max(100),
			security: z.number().min(0).max(100),
			ux: z.number().min(0).max(100),
		}),
		// Lighthouse scores (0-100, from Google Lighthouse audit)
		lighthouse: z
			.object({
				performance: z.number().min(0).max(100),
				accessibility: z.number().min(0).max(100),
				bestPractices: z.number().min(0).max(100),
				seo: z.number().min(0).max(100),
			})
			.optional(),
		// Dependency health metrics
		dependencies: z
			.object({
				total: z.number(), // Total dependency count
				outdated: z.number(), // Packages with available updates
				vulnerabilities: z
					.object({
						critical: z.number().default(0),
						high: z.number().default(0),
						moderate: z.number().default(0),
						low: z.number().default(0),
					})
					.optional(),
				lastChecked: z.string().optional(), // ISO date
			})
			.optional(),
		// API conformity checks
		apiConformity: z
			.object({
				consistentResponses: z.boolean(), // Uses ApiResult<T> format
				errorCodes: z.boolean(), // Consistent HTTP error codes
				pagination: z.boolean(), // Supports pagination where needed
				versioning: z.boolean(), // API versioning (/api/v1/)
				documentation: z.boolean(), // Swagger/OpenAPI docs
				healthEndpoint: z.boolean(), // /health endpoint
				validation: z.boolean(), // DTO validation on all inputs
			})
			.optional(),
		// Cross-app consistency (shared package usage)
		consistency: z
			.object({
				sharedAuth: z.boolean(), // Uses @mana/shared-nestjs-auth or nestjs-integration
				sharedUi: z.boolean(), // Uses @mana/shared-ui components
				sharedTheme: z.boolean(), // Uses @mana/shared-theme
				sharedBranding: z.boolean(), // Uses @mana/shared-branding
				sharedI18n: z.boolean(), // Uses @mana/shared-i18n
				sharedErrorTracking: z.boolean(), // Uses @mana/shared-error-tracking
				sharedStorage: z.boolean().optional(), // Uses @mana/shared-storage (if applicable)
				sharedLlm: z.boolean().optional(), // Uses @mana/shared-llm (if applicable)
			})
			.optional(),
		// Analytics maturity (tracking depth) — historische Manascore-Metrik;
		// Web-Analytics ist Verein-weit entfernt (2026-05-26).
		analytics: z
			.object({
				pageViewTracking: z.boolean(), // page-view tracking (automatic)
				customEvents: z.boolean(), // App-specific custom events implemented
				authTracking: z.boolean(), // Login/signup/logout tracked via shared-auth
				landingTracking: z.boolean(), // Landing page CTA/pricing events
				publicDashboard: z.boolean(), // public analytics dashboard configured
			})
			.optional(),
		// Score history for trend visualization
		history: z
			.array(
				z.object({
					date: z.string(), // ISO date string e.g. "2026-03-19"
					score: z.number().min(0).max(100),
				})
			)
			.optional(),
		// Readiness level
		status: z.enum(['prototype', 'alpha', 'beta', 'production', 'mature']),
		// Stats
		stats: z
			.object({
				backendModules: z.number().optional(),
				webRoutes: z.number().optional(),
				components: z.number().optional(),
				dbTables: z.number().optional(),
				testFiles: z.number().optional(),
				testCount: z.number().optional(),
				languages: z.number().optional(),
				linesOfCode: z.number().optional(),
				sourceFiles: z.number().optional(),
				sizeInMb: z.number().optional(),
				commits: z.number().optional(),
				contributors: z.number().optional(),
				firstCommitDate: z.string().optional(),
				todoCount: z.number().optional(),
				apiEndpoints: z.number().optional(),
				stores: z.number().optional(),
				maxFileLines: z.number().optional(),
			})
			.optional(),
	}),
});

const blueprintsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.date(),
		author: z.string().default('Till Schneider'),
		category: z.enum([
			'architecture',
			'infrastructure',
			'database',
			'security',
			'federation',
			'licensing',
			'business-model',
		]),
		status: z
			.enum(['draft', 'proposal', 'accepted', 'implemented', 'superseded'])
			.default('proposal'),
		tags: z.array(z.string()).optional(),
		featured: z.boolean().default(false),
		readTime: z.number().optional(),
		relatedBlueprints: z.array(z.string()).optional(),
		decisionDate: z.date().optional(),
	}),
});

export const collections = {
	apps: appsCollection,
	branchen: targetGroupsCollection,
	legal: legalCollection,
	privacy: privacyCollection,
	clients: clientsCollection,
	mission: missionCollection,
	context: contextCollection,
	devlog: devlogCollection,
	manascore: manascoreCollection,
	blueprints: blueprintsCollection,
};
