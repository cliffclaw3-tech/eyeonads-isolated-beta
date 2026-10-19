import { load } from 'cheerio';
import { readPublicPage } from './public-page.ts';
import { previewAgents, type PublicAgent, type PublicOffice } from './public-brokerage-preview.ts';

const DIRECTORY_LINK = /(?:agents?|realtors?|our[-_ ]team|meet[-_ ](?:our[-_ ])?team|associates|people|staff|brokers?)/i;
const ROLE = /\b(?:realtor|real estate agent|real estate broker|affiliate broker|managing broker|broker|sales associate|email me)\b/i;
const BAD_NAME = /\b(?:realty|properties|homes|office|team|collective|contact|search|listing|locations|learn|read|view|more|information|website|facebook|instagram|brokerage|group)\b/i;
export type DirectoryAudit = { url: string; status: 'read' | 'blocked' | 'pending' | 'rejected'; agents: number };
const tidy = (value: string) => value.replace(/\s+/g, ' ').trim();

function personName(raw: string): string | null {
  const name = tidy(raw).replace(/\s*(?:[-|–]\s*)?(?:REALTOR|BROKER)\s*®?\s*$/i, '').trim();
  if (/^(?:meet|about|find|email|call|choose|contact|view|read|visit)\b/i.test(name) || /^(?:broker support|daily rotation)$/i.test(name)) return null;
  if (name.length < 5 || name.length > 80 || BAD_NAME.test(name) || /\d|[@<>]/.test(name)) return null;
  const words = name.split(/\s+/);
  return words.length >= 2 && words.length <= 5 && words.every(word => /^["“”]?[\p{L}][\p{L}'’.\-]*["“”]?$/u.test(word)) ? name : null;
}

function sameSite(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base), root = new URL(base);
    const host = (value: URL) => value.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || host(url) !== host(root) || url.username || url.password || url.port || url.hash) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function inspectDirectory(html: string, pageUrl: string, directoryPage = false) {
  const $ = load(html);
  const structured: {name:string;url:string;role:string}[] = [];
  const structuredTotals:number[]=[];
  let visitedObjects=0;
  function inspectJson(value:unknown,depth=0) {
    if(depth>8 || ++visitedObjects>2000 || !value || typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(item=>inspectJson(item,depth+1));return;}
    const row=value as Record<string,unknown>;
    if(row['@type']==='ItemList' && Array.isArray(row.itemListElement) && /agents?|team|roster/i.test(String(row.name||''))) {
      if(Number.isInteger(row.numberOfItems)&&Number(row.numberOfItems)>0)structuredTotals.push(Number(row.numberOfItems));
      for(const entry of row.itemListElement.slice(0,1000)){
        const person=entry?.item;
        if(person?.['@type']==='Person' && typeof person.name==='string')structured.push({name:person.name,url:typeof person.url==='string'?person.url:'',role:String(person.jobTitle||'')});
      }
    }
    for(const field of ['@graph','mainEntity'])if(row[field])inspectJson(row[field],depth+1);
  }
  $('script[type="application/ld+json"]').slice(0,12).each((_,node)=>{const raw=$(node).text();if(raw.length<300000)try{inspectJson(JSON.parse(raw));}catch{/* Data only, never execute scripts. */}});
  $('br').replaceWith(' ');
  $('script,style,noscript,template,[hidden],[aria-hidden="true"]').remove();
  const links = new Set<string>();
  const pages = new Set<string>();
  const people: {name:string;profile_url:string}[] = [];
  const totals = new Set<number>(structuredTotals);
  const unresolved = new Map<string,{name:string;reason:string;source_url:string}>();
  const bodyText = tidy($('body').find('*').addBack().contents().filter((_, node) => node.type === 'text').map((_, node) => $(node).text()).get().join(' '));
  for (const match of bodyText.matchAll(/\b([\d,]+)\s+(?:agents?|realtors?)\b/gi)) { const n = Number(match[1].replaceAll(',', '')); if (n > 0 && n <= 10000) totals.add(n); }
  const dynamic = $('[aria-label*="Load more"],button').toArray().some(node => /load more|show more agents/i.test(tidy($(node).text()) || $(node).attr('aria-label') || ''));
  const names = new Set<string>();
  for(const person of structured) {
    const name=tidy(person.name);
    if(/&|\band\b/i.test(name)||/support|assistant|administrator|marketing director/i.test(person.role)){
      unresolved.set(name.toLowerCase(),{name,reason:/&|\band\b/i.test(name)?'Combined team card: confirm individual members.':'Role needs broker review; not counted as an agent.',source_url:pageUrl});continue;
    }
    const clean=personName(name),profile=sameSite(person.url,pageUrl);
    if(clean && bodyText.includes(tidy(name))){names.add(clean);if(profile)people.push({name:clean,profile_url:profile});}
  }
  $('a[href]').each((_, node) => {
    const element = $(node), url = sameSite(element.attr('href') || '', pageUrl);
    if (!url) return;
    const label = tidy(element.text());
    const path = new URL(url).pathname;
    const profile = /\/agent-profile\/[^/]+/i.test(path) || (/\/agent\.php$/i.test(path) && new URL(url).searchParams.has('agentid')) || /\/agents?\/[^/]+/i.test(path);
    if (DIRECTORY_LINK.test(`${label} ${path}`) && (!profile || !personName(label))) links.add(url);
    if (directoryPage && (new URL(url).pathname === new URL(pageUrl).pathname || /\/page\/\d+\/?$/.test(new URL(url).pathname)) && (/^\d{1,3}$/.test(label) || /^(?:next|last|›|»)$/i.test(label) || element.attr('rel') === 'next')) pages.add(url);
    if (directoryPage && profile && path !== new URL(pageUrl).pathname) {
      if(label && /&|\band\b|\bteam\b|\bcollective\b/i.test(label)){
        unresolved.set(label.toLowerCase(),{name:label,reason:'Team card: confirm individual members; not counted as one person.',source_url:pageUrl});return;
      }
      const name = personName(label);
      if (name && !unresolved.has(name.toLowerCase())) { names.add(name); people.push({name,profile_url:url}); }
    }
  });
  if (directoryPage) $('h1,h2,h3,h4,[class*="team_member_box_overlay_title"],[class*="agent-name"],[class*="agent_name"],[class*="agent"][class*="name"],[class*="team-member-name"],[itemprop="name"],[class*="agentListing"] strong').each((_, node) => {
    const element = $(node), name = personName(element.text());
    if (!name || unresolved.has(name.toLowerCase())) return;
    const container = element.parent().closest('article,li,[class*="agent"],[class*="team"],[class*="member"]');
    const scope = container.length ? container : element.parent();
    const context = tidy(scope.find('h1,h2,h3,h4,p,span,a,dd,[class*="subtitle"]').map((_, child) => $(child).text()).get().join(' ')).slice(0, 450);
    const profile = scope.find('a[href]').toArray().map(a => sameSite($(a).attr('href') || '', pageUrl)).find(url => url && new URL(url).pathname !== new URL(pageUrl).pathname && /\/(?:agents?|agent-profile|realtors?)\//i.test(new URL(url).pathname));
    if (ROLE.test(context) || profile) {
      names.add(name);
      if (profile && !people.some(person => person.name === name && person.profile_url === profile)) people.push({name,profile_url:profile});
    }
  });
  return { links: [...links], pages: [...pages], names: [...names], people, totals: [...totals], dynamic, unresolved: [...unresolved.values()] };
}

export async function readOfficialDirectory(
  offices: PublicOffice[], defaultOffice: PublicOffice,
  read?: (url: string) => Promise<{ url: string; html: string }>,
): Promise<{ agents: PublicAgent[]; pagesRead: number; incomplete: boolean; audit: DirectoryAudit[]; publishedTotals: number[]; unresolved: {name:string;reason:string;source_url:string}[] }> {
  const deadline = Date.now() + 60000;
  const fetchPage = read ?? (async (url: string) => {
    const page = await readPublicPage(url, { timeoutMs: 9000, deadline, includeHtml: true });
    return { url: page.url, html: page.html || '' };
  });
  const officeKey = `${defaultOffice.name}|${defaultOffice.location}`;
  const seeds = offices.flatMap(office => [office.website, office.source_url]).filter(Boolean).slice(0, 20);
  const queue: { url: string; directory: boolean }[] = seeds.map(url => ({ url, directory: DIRECTORY_LINK.test(new URL(url).pathname) }));
  const visited = new Set<string>();
  const found = new Map<string, PublicAgent>();
  const audit: DirectoryAudit[] = [];
  const unresolved:{name:string;reason:string;source_url:string}[]=[];
  const totals = new Set<number>();
  let pagesRead = 0, incomplete = false;
  while (queue.length && visited.size < 80 && Date.now() < deadline) {
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    visited.add(item.url);
    try {
      const page = await fetchPage(item.url);
      const source = sameSite(page.url, item.url);
      if (!source) { incomplete = true; audit.push({url:item.url,status:'rejected',agents:0}); continue; }
      const directory = item.directory || DIRECTORY_LINK.test(new URL(source).pathname);
      const result = inspectDirectory(page.html, source, directory);
      audit.push({url:source,status:'read',agents:result.names.length});
      result.totals.forEach(total => totals.add(total));
      for(const row of result.unresolved)if(!unresolved.some(old=>old.name===row.name))unresolved.push(row);
      if(result.unresolved.length)incomplete=true;
      if (directory && result.dynamic) incomplete = true;
      if (directory) {
        pagesRead++;
        for (const name of result.names) {
          const profiles = result.people.filter(person => person.name === name);
          const candidates = profiles.length ? profiles : [{name,profile_url:''}];
          for (const person of candidates) {
            const key = person.profile_url || name.toLowerCase();
            if (!found.has(key)) found.set(key, { name, office: officeKey, source_url: source, profile_url: person.profile_url });
          }
        }
        for (const url of result.pages) if (!visited.has(url)) queue.push({ url, directory: true });
      } else {
        for (const url of result.links.slice(0, 8)) if (!visited.has(url)) queue.push({ url, directory: true });
      }
    } catch { incomplete = true; audit.push({url:item.url,status:'blocked',agents:0}); }
  }
  if (new Set([...found.values()].map(person => person.name.toLowerCase())).size !== found.size) incomplete = true;
  if (totals.size > 1) incomplete = true;
  if (queue.some(item => !visited.has(item.url)) || found.size > 1000 || found.size === 0) incomplete = true;
  for (const item of queue) if (!visited.has(item.url) && !audit.some(row => row.url === item.url)) audit.push({url:item.url,status:'pending',agents:0});
  return { agents: previewAgents([...found.values()], offices), pagesRead, incomplete, audit, publishedTotals: [...totals], unresolved };
}
