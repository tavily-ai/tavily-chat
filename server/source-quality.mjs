// Canonicalize observed URLs only; preserve parameters that identify actual content.
export function canonicalUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    const asin = /(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})(?:[/?]|$)/i.exec(url.pathname);
    if (/(^|\.)amazon\.[a-z.]+$/.test(url.hostname) && asin) {url.pathname='/dp/'+asin[1].toUpperCase();url.search='';}
    for (const key of [...url.searchParams.keys()]) if (/^(utm_.+|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href.replace(/\/$/, '');
  } catch { return null; }
}

export function publisher(value) {
  const host = new URL(value).hostname.replace(/^www\./, '');
  const parts = host.split('.');
  const suffix = parts.slice(-2).join('.');
  return parts.slice(-(/^(co|com|org|ac|gov)\.[a-z]{2}$/.test(suffix) ? 3 : 2)).join('.');
}

// Round-robin by publisher after relevance ordering. This is a diversity heuristic,
// not a claim that a domain or search score establishes factual reliability.
export function diverseSources(items, {limit = 8, perPublisher = 2} = {}) {
  const unique = new Map();
  for (const item of items || []) {
    const url = canonicalUrl(item?.url);
    if (!url || !String(item.content || '').trim()) continue;
    const candidate = {...item, url};
    const previous = unique.get(url);
    if (!previous || (Number(candidate.score) || 0) > (Number(previous.score) || 0) || String(candidate.content).length > String(previous.content).length) unique.set(url, candidate);
  }
  const groups = new Map();
  for (const item of [...unique.values()].sort((a,b) => Number(Boolean(b.primary))-Number(Boolean(a.primary)) || (Number(b.score)||0)-(Number(a.score)||0))) {
    const key = publisher(item.url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const result = [];
  for (let round = 0; round < perPublisher && result.length < limit; round++) {
    for (const group of groups.values()) if (group[round] && result.length < limit) result.push(group[round]);
  }
  return result;
}
