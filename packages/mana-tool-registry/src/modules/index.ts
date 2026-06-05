/**
 * Module barrel — call `registerAllModules()` at process startup to
 * populate the registry with every bundled tool.
 *
 * Adding a new module:
 *   1. Create `src/modules/<module>.ts` with one or more `ToolSpec` exports
 *      and a `register<Module>Tools()` function that calls `registerTool()`
 *      for each.
 *   2. Import + call it from this file.
 *   3. Extend `ModuleId` in `../types.ts`.
 */

import { registerJournalTools } from './journal.ts';
import { registerMeTools } from './me.ts';
import { registerMoodTools } from './mood.ts';
import { registerNotesTools } from './notes.ts';
import { registerSpacesTools } from './spaces.ts';
import { registerTodoTools } from './todo.ts';
import { registerAugurTools } from './augur.ts';

export function registerAllModules(): void {
	registerJournalTools();
	registerMeTools();
	registerMoodTools();
	registerNotesTools();
	registerSpacesTools();
	registerTodoTools();
	registerAugurTools();
}

export {
	registerJournalTools,
	registerMeTools,
	registerMoodTools,
	registerNotesTools,
	registerSpacesTools,
	registerTodoTools,
	registerAugurTools,
};
