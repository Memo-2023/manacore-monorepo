/**
 * Trigger Action Catalog
 *
 * Maps appId → actionName → handler function.
 * All imports are lazy to avoid circular dependencies.
 */

export type ActionHandler = (
	params: Record<string, string>,
	sourceData: Record<string, unknown>
) => Promise<void>;

export const ACTIONS: Record<string, Record<string, ActionHandler>> = {
	todo: {
		createTask: async (params, source) => {
			const { tasksStore } = await import('$lib/modules/todo/stores/tasks.svelte');
			await tasksStore.createTask({
				title: params.title || (source.title as string) || 'Triggered Task',
			});
		},
	},
	notes: {
		createNote: async (params, source) => {
			const { notesStore } = await import('$lib/modules/notes/stores/notes.svelte');
			await notesStore.createNote({
				title: params.title || (source.title as string) || 'Triggered Note',
				content: params.content || '',
			});
		},
	},
};

export function getAction(appId: string, actionName: string): ActionHandler | undefined {
	return ACTIONS[appId]?.[actionName];
}
