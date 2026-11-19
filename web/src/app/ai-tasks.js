// The named Claude tasks and their prompts live with the server function, which is their real home.
// The app needs them only where the page has its own Claude: the browser tests' stand-in.
export { TASKS } from '../../../supabase/functions/_shared/ai-tasks.js';
