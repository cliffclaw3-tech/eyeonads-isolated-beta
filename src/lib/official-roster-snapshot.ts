import snapshots from './official-roster-snapshots.json' with { type: 'json' };
import { previewAgents, type PublicOffice } from './public-brokerage-preview.ts';

// Operator-observed public directories are a dated recovery source, never a
// confirmed company roster. Exact host + office scope prevents franchise leakage.
export function officialRosterSnapshot(offices: PublicOffice[], office: PublicOffice, now = Date.now()) {
  const host = (url: string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
  const row = snapshots.find(item =>
    offices.length === 1 && offices[0].name === office.name && offices[0].location === office.location &&
    host(office.website || office.source_url) === item.host &&
    office.location.toLowerCase().includes(item.office_location.toLowerCase()) &&
    now >= Date.parse(item.observed_at) && now < Date.parse(item.expires_at));
  if (!row) return null;
  const officeKey = `${office.name}|${office.location}`;
  return {
    agents: previewAgents(row.records.map(person => ({...person, office: officeKey, source_url: row.source_url})), offices),
    unresolved: row.records.filter(person => /&|\band\b|\bteam\b|\bcollective\b/i.test(person.name)).map(person => ({name: person.name, source_url: person.profile_url, reason: 'Team card: confirm individual members; not counted as one person.'})),
    note: `The live directory lookup was incomplete. Showing a saved copy of the official directory checked on ${row.observed_at}. Review current membership and team cards before saving; this is not a verified complete roster.`,
  };
}
