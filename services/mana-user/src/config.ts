export interface Config {
	port: number;
	databaseUrl: string;
	manaAuthUrl: string;
	serviceKey: string;
	cors: { origins: string[] };
}

export function loadConfig(): Config {
	const env = (key: string, fallback?: string) => process.env[key] || fallback || '';
	return {
		port: parseInt(env('PORT', '3062'), 10),
		databaseUrl: env('DATABASE_URL', 'postgresql://mana:devpassword@localhost:5432/mana_platform'),
		manaAuthUrl: env('MANA_AUTH_URL', 'http://localhost:3001'),
		serviceKey: env('MANA_SERVICE_KEY', 'dev-service-key'),
		cors: { origins: env('CORS_ORIGINS', 'http://localhost:5173').split(',') },
	};
}
