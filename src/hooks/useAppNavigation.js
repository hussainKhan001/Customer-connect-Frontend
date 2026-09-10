/* Thin wrapper around useNavigate() preserving the exact call-site API
   the app used before real routing existed (openCustomer/openSegment/
   openStatement, previously composite actions on AppContext) — every
   caller just swaps its import, no logic changes. */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAppNavigation() {
  const navigate = useNavigate();
  const openCustomer = useCallback((id) => navigate(`/master/${id}`), [navigate]);
  const openSegment = useCallback((seg) => navigate(`/base?seg=${encodeURIComponent(seg)}`), [navigate]);
  const openStatement = useCallback((id) => navigate(`/statement/${id}`), [navigate]);
  return { openCustomer, openSegment, openStatement };
}
