/**
 * Chat module — LLM completions (sync + streaming SSE)
 * Ported from apps/chat/apps/server
 *
 * CRUD for conversations/messages handled by mana-sync.
 * This module handles AI completions via mana-llm or OpenRouter.
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { consumeCredits, validateCredits } from '@mana/shared-hono/credits';
import type { AuthVariables } from '@mana/shared-hono';

const LLM_URL = process.env.MANA_LLM_URL || 'http://localhost:3025';

const routes = new Hono<{ Variables: AuthVariables }>();

// ─── Chat Completion (sync) ──────────────────────────────────

routes.post('/completions', async (c) => {
	const userId = c.get('userId');
	const { messages, model, temperature, maxTokens } = await c.req.json();

	if (!messages?.length) return c.json({ error: 'messages required' }, 400);

	const isLocal = !model || model.startsWith('ollama/') || model.startsWith('local/');
	const cost = isLocal ? 0.1 : 5;

	const validation = await validateCredits(userId, 'AI_CHAT', cost);
	if (!validation.hasCredits) {
		return c.json({ error: 'Insufficient credits', required: cost }, 402);
	}

	try {
		const llmRes = await fetch(`${LLM_URL}/api/v1/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages,
				model: model || 'gemma4:12b',
				temperature: temperature || 0.7,
				max_tokens: maxTokens || 2000,
			}),
		});

		if (!llmRes.ok) return c.json({ error: 'LLM request failed' }, 502);

		const data = await llmRes.json();
		await consumeCredits(userId, 'AI_CHAT', cost, `Chat: ${model || 'gemma4:12b'}`);

		return c.json(data);
	} catch (_err) {
		return c.json({ error: 'Chat completion failed' }, 500);
	}
});

// ─── Chat Completion (streaming SSE) ─────────────────────────

routes.post('/completions/stream', async (c) => {
	const userId = c.get('userId');
	const { messages, model, temperature, maxTokens } = await c.req.json();

	if (!messages?.length) return c.json({ error: 'messages required' }, 400);

	const isLocal = !model || model.startsWith('ollama/') || model.startsWith('local/');
	const cost = isLocal ? 0.1 : 5;

	const validation = await validateCredits(userId, 'AI_CHAT', cost);
	if (!validation.hasCredits) {
		return c.json({ error: 'Insufficient credits' }, 402);
	}

	return streamSSE(c, async (stream) => {
		try {
			const llmRes = await fetch(`${LLM_URL}/api/v1/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages,
					model: model || 'gemma4:12b',
					temperature: temperature || 0.7,
					max_tokens: maxTokens || 2000,
					stream: true,
				}),
			});

			if (!llmRes.ok || !llmRes.body) {
				await stream.writeSSE({ data: JSON.stringify({ error: 'LLM failed' }) });
				return;
			}

			const reader = llmRes.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = decoder.decode(value, { stream: true });
				// Forward SSE chunks directly
				for (const line of chunk.split('\n')) {
					if (line.startsWith('data: ')) {
						await stream.writeSSE({ data: line.slice(6) });
					}
				}
			}

			await stream.writeSSE({ data: '[DONE]' });
			consumeCredits(userId, 'AI_CHAT', cost, `Chat stream: ${model || 'gemma4:12b'}`).catch(
				() => {}
			);
		} catch (_err) {
			await stream.writeSSE({ data: JSON.stringify({ error: 'Stream failed' }) });
		}
	});
});

// ─── Models List ─────────────────────────────────────────────

routes.get('/models', async (c) => {
	try {
		const res = await fetch(`${LLM_URL}/api/v1/models`);
		if (res.ok) return c.json(await res.json());
	} catch {
		// Fallback
	}
	return c.json({ models: [] });
});

export { routes as chatRoutes };
