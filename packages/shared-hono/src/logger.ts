/**
 * Structured request logging middleware for Hono servers.
 *
 * - Generates a unique request ID per request (X-Request-Id header)
 * - Logs request/response as JSON lines (in production) or console (in dev)
 * - Integrates with @mana/shared-logger for consistent format
 *
 * @example
 * ```ts
 * import { requestLogger } from '@mana/shared-hono/logger';
 * app.use('*', requestLogger());
 * ```
 */

import type { MiddlewareHandler } from 'hono';
import { logger as log, configureLogger } from '@mana/shared-logger';

/**
 * Initialize the Hono logger with a service name.
 * Call once at server startup before registering the middleware.
 */
export function initLogger(serviceName: string): void {
	configureLogger({ serviceName });
}

/**
 * Hono middleware that adds a request ID and logs request + response.
 */
export function requestLogger(): MiddlewareHandler {
	return async (c, next) => {
		const requestId = c.req.header('x-request-id') || crypto.randomUUID().slice(0, 8);
		c.header('X-Request-Id', requestId);

		const method = c.req.method;
		const path = c.req.path;
		const start = performance.now();

		log.info('request', { requestId, method, path });

		await next();

		const durationMs = Math.round(performance.now() - start);
		const status = c.res.status;

		if (status >= 500) {
			log.error('response', { requestId, method, path, status, durationMs });
		} else if (status >= 400) {
			log.warn('response', { requestId, method, path, status, durationMs });
		} else {
			log.info('response', { requestId, method, path, status, durationMs });
		}
	};
}
