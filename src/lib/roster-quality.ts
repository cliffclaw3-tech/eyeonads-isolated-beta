/** Counts are reconciliation evidence, never proof of affiliation or a complete roster. */
export function rosterQuality(found: number, expected: number, incomplete: boolean, publishedTotals: number[] = []) {
  const totals = [...new Set(publishedTotals.filter(n => Number.isInteger(n) && n > 0))];
  const missing = expected > 0 ? Math.max(0, expected - found) : null;
  const extra = expected > 0 ? Math.max(0, found - expected) : null;
  const reasons: string[] = [];
  if (!found) reasons.push('No agents found. This is a failed lookup, not an empty company.');
  if (incomplete) reasons.push('The public roster could not be fully reconciled: pages may be unread, dynamic, outside the lookup budget, or contain ambiguous identities.');
  if (!expected) reasons.push('Enter the expected headcount for the offices you manage; it is not inferred from search results.');
  if (missing) reasons.push(`${missing} agents are missing compared with your expected count of ${expected}.`);
  if (extra) reasons.push(`${extra} extra names need checking against your selected offices.`);
  if (totals.some(total => total !== found)) reasons.push('A published directory total differs from the names collected; check its office scope.');
  if (found >= 1000) reasons.push('The beta lookup limit was reached; use an authorized roster export to reconcile the remainder.');
  return {status: reasons.length ? 'incomplete' : 'needs_broker_review', found, expected, missing, extra,
    complete: false, reasons, published_totals: totals,
    review_required: 'Confirm every selected office and agent affiliation. Matching counts alone do not establish completeness.'};
}
