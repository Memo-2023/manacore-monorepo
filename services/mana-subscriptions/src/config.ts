export interface Config {
	port: number;
	databaseUrl: string;
	manaAuthUrl: string;
	serviceKey: string;
	baseUrl: string;
	stripe: { secretKey: string; webhookSecret: string };
	cors: { origins: string[] };
}

export function loadConfig(): Config {
	const env = (key: string, fallback?: string) => process.env[key] || fallback || '';
	return {
		port: parseInt(env('PORT', '3063'), 10),
		databaseUrl: env('DATABASE_URL', 'postgresql://mana:devpassword@localhost:5432/mana_platform'),
		manaAuthUrl: env('MANA_AUTH_URL', 'http://localhost:3001'),
		serviceKey: env('MANA_SERVICE_KEY', 'dev-service-key'),
		baseUrl: env('BASE_URL', 'http://localhost:3063'),
		stripe: {
			secretKey: env('STRIPE_SECRET_KEY'),
			webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
		},
		cors: { origins: env('CORS_ORIGINS', 'http://localhost:5173').split(',') },
	};
}
