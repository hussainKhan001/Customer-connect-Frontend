import { useMutation } from '@tanstack/react-query';
import { useApp as useAppUntyped } from '../context/AppContext.jsx';

interface ApiError extends Error {
  errors?: Record<string, string>;
}

/* AppContext.jsx is untyped legacy JS (out of scope to type in this pilot
   slice) — cast once here at the import boundary. */
const useApp = useAppUntyped as () => { updateSettings: (patch: Record<string, unknown>) => Promise<unknown> };

/* Thin TanStack Query wrapper around AppContext's existing updateSettings —
   AppContext stays the source of truth for `settings`/`masterData` (it
   already calls setSettings() on success), this just gives callers
   `isPending` for duplicate-submit prevention and a consistent mutation
   API without introducing a second data-fetching layer in this phase. */
export function useSettingsMutation() {
  const { updateSettings } = useApp();
  return useMutation<unknown, ApiError, Record<string, unknown>>({
    mutationFn: (patch) => updateSettings(patch),
  });
}
