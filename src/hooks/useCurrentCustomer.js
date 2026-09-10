import { useParams } from 'react-router-dom';

/* Resolves the record named by the URL's :id param against `candidates`.
   If :id is missing or doesn't match, returns `fallback` instead, and
   flags `isFallback: true` so the caller can replace() the URL to the
   record actually being shown. Each page defines its own `fallback`
   rule (Customer Master prefers Segment A; Portfolio Statement takes
   the head of its gain-sorted pool) — those two rules genuinely
   differ, so this hook doesn't hardcode either one. */
export function useCurrentCustomer(candidates, fallback) {
  const { id } = useParams();
  const picked = id ? candidates.find((c) => c.id === id) : undefined;
  const current = picked || fallback;
  return { current, isFallback: current !== undefined && current !== picked };
}
