// Radar · scan auto — lancé toutes les heures par GitHub Actions (.github/workflows/scan-auto.yml).
// 1) Lit les annonces récentes AutoScout24 (France, Belgique, Luxembourg, Allemagne), SUV d'abord puis toutes carrosseries.
// 2) Estime la cote de chaque annonce prometteuse à partir d'annonces comparables (même modèle, année, carburant), ajustée au km.
// 3) Écrit site/data/auto.json et envoie une alerte Telegram (secrets TG_TOKEN et TG_CHAT) pour chaque très bonne affaire.
// Aucune dépendance. Réglages dans auto-config.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const CFG = { seuil: 30, budget: 15000, annee: 2022, kmmax: 100000, decoteMin: 18, pays: 'F,B,L,D', ...JSON.parse(readFileSync('auto-config.json', 'utf8')) };
const SITE = 'https://fertri2.github.io/Radar-crypto/';
const AS = 'https://www.autoscout24.fr';
const HEADERS = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'accept-language': 'fr-FR,fr;q=0.9', accept: 'text/html,application/xhtml+xml' };
const { ficheFor, familleFor } = new Function(readFileSync('site/auto-fiches.js', 'utf8') + ';return { ficheFor, familleFor };')();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
let requests = 0;

async function page(url) {
  for (let a = 0; a < 3; a++) {
    try {
      requests++;
      const r = await fetch(url, { headers: HEADERS });
      if (r.status === 429 || r.status === 403) { await sleep(4000 * (a + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const h = await r.text();
      const m = h.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!m) throw new Error('données absentes');
      return JSON.parse(m[1]).props.pageProps;
    } catch (e) { if (a === 2) throw e; await sleep(1500); }
  }
  throw new Error('bloqué (403/429)');
}

// État précédent (publié sur le site)
let prev = { deals: [], refs: {}, alerted: [] };
try {
  if (existsSync('site/data/auto.json')) prev = { ...prev, ...JSON.parse(readFileSync('site/data/auto.json', 'utf8')) };
  else { const r = await fetch(SITE + 'data/auto.json?t=' + Date.now(), { headers: { 'cache-control': 'no-cache' } }); if (r.ok) prev = { ...prev, ...(await r.json()) }; }
} catch (e) { errors.push('État précédent : ' + e.message); }

const now = Date.now();
const known = new Set(prev.deals.map(d => d.id));
const seen = new Set();
const listings = [];
const base = `&cy=${CFG.pays}&atype=C&ustate=N,U&fregfrom=${CFG.annee}&kmto=${CFG.kmmax}&priceto=${Math.round(CFG.budget * 1.3)}&sort=age&desc=1`;
const deep = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'; // lancement manuel = balayage profond
const cheap = base.replace('&sort=age&desc=1', '&sort=price&desc=0');
const passes = [['suv', `${AS}/lst?body=4${base}`, 10], ['toutes', `${AS}/lst?${base.slice(1)}`, 5], ['suv', `${AS}/lst?body=4${cheap}`, deep ? 20 : 2], ['toutes', `${AS}/lst?${cheap.slice(1)}`, deep ? 10 : 1]];
for (const [body, url, pages] of passes) {
  for (let p = 1; p <= pages; p++) {
    try {
      const pp = await page(`${url}&page=${p}`);
      for (const x of pp.listings || []) if (!seen.has(x.id)) { seen.add(x.id); listings.push({ ...x, _body: body }); }
    } catch (e) { errors.push(`Liste ${body} p${p} : ${e.message}`); break; }
    await sleep(700);
  }
}

const yr = x => +(x.tracking?.firstRegistration || '').split('-')[1];
const mk = x => (x.tracking?.modelTaxonomy?.match(/make_id:(\d+)/) || [])[1];
const med = a => { a = [...a].sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : NaN; };

const refs = {};
for (const [k, v] of Object.entries(prev.refs || {})) if (now - v.t < 36 * 3600e3) refs[k] = v;

async function comps(key) {
  if (refs[key]) return refs[key].c;
  const [m, mo, y, f] = key.split('|');
  const out = [];
  for (const p of [1, 2]) {
    try {
      const pp = await page(`${AS}/lst?mmmv=${m}|${mo}||&fregfrom=${y}&fregto=${y}&fuel=${f.toUpperCase()}&cy=${CFG.pays}&atype=C&ustate=N,U&page=${p}`);
      for (const x of pp.listings || []) if (String(x.vehicle?.modelId) === mo && !/toolow/.test(x.tracking?.priceLabel || '')) out.push([x.price.priceRaw, +x.tracking.mileage]);
      if ((pp.listings || []).length < 20) break;
    } catch (e) { errors.push(`Comparables ${key} : ${e.message}`); break; }
    await sleep(600);
  }
  refs[key] = { t: now, c: out };
  return out;
}

function cote(cs, km) {
  if (cs.length >= 8) {
    const n = cs.length, mx = cs.reduce((s, c) => s + c[1], 0) / n, my = cs.reduce((s, c) => s + c[0], 0) / n;
    let sxy = 0, sxx = 0; for (const c of cs) { sxy += (c[1] - mx) * (c[0] - my); sxx += (c[1] - mx) ** 2; }
    const b = Math.max(-0.15, Math.min(0, sxx ? sxy / sxx : 0));
    return { ref: my + b * (km - mx) + med(cs.map(c => c[0] - (my + b * (c[1] - mx)))), n };
  }
  const near = cs.filter(c => Math.abs(c[1] - km) <= 25000);
  return near.length >= 5 ? { ref: med(near.map(c => c[0])), n: near.length } : null;
}

const fresh = [];
const perModel = {};
let candidates = 0;
for (const x of listings) {
  const id = 'as24-' + x.id.slice(0, 8);
  const lab = (x.tracking?.priceLabel || '').trim();
  if (known.has(id) || x.vehicle?.isCurrentlyDamaged || !/top|good|toolow/.test(lab)) continue;
  const key = `${mk(x)}|${x.vehicle.modelId}|${yr(x)}|${x.tracking.fuelType}`;
  if (key.includes('undefined')) continue;
  candidates++;
  const km = +x.tracking.mileage, prix = x.price.priceRaw;
  const c = cote(await comps(key), km);
  if (!c || !(c.ref > 0)) continue;
  const dec = (c.ref - prix) / c.ref * 100;
  const fam = familleFor(`${x.vehicle.make} ${x.vehicle.model} ${x.vehicle.modelVersionInput || ''}`).s || 0;
  if (dec < (fam >= 2 ? CFG.decoteMinFamille ?? 12 : CFG.decoteMin)) continue;
  const model = `${x.vehicle.make} ${x.vehicle.model}`;
  perModel[model] = (perModel[model] || 0) + 1; if (perModel[model] > (fam >= 2 ? 8 : 3)) continue;
  const cc = x.location?.countryCode || '?', pro = x.seller?.type === 'Dealer';
  const imp = cc !== 'FR';
  const signaux = [];
  if (/toolow/.test(lab)) signaux.push('prixanormal');
  if (/apport|par-mois|mensualit|leasing/i.test(x.url + ' ' + (x.vehicle.modelVersionInput || ''))) signaux.push('appat');
  const titre = `${model} ${x.vehicle.modelVersionInput || x.vehicle.motorTypeName || ''}`.replace(/\s+/g, ' ').trim().slice(0, 80);
  fresh.push({
    id, titre, annee: yr(x), km, prix, cote: Math.round(c.ref / 10) * 10, n: c.n,
    frais: imp ? (pro ? 700 : 900) : 300, source: imp ? 'import' : (pro ? 'pro' : 'particulier'),
    ville: `${(x.location?.city || '').trim()} (${cc})`, url: AS + x.url, carburant: x.vehicle.fuel || '',
    carrosserie: x._body === 'suv' ? 'SUV' : '', label: lab, signaux, photo: (x.images || [])[0] || '', detecteLe: new Date(now).toISOString()
  });
}

const deals = [...fresh, ...prev.deals.filter(d => now - Date.parse(d.detecteLe) < 21 * 864e5)].slice(0, 500);

// Alertes Telegram : décote frais compris ≥ seuil et aucun signal d'arnaque
const alerted = new Set(prev.alerted || []);
const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';
const famS = d => familleFor(d.titre, d.places).s || 0;
const hot = fresh.filter(d => !d.signaux.length && !alerted.has(d.id) && (d.cote - d.prix - d.frais) / d.cote * 100 >= (famS(d) >= 2 ? CFG.seuilFamille ?? CFG.seuil : CFG.seuil))
  .sort((a, b) => famS(b) - famS(a)).slice(0, 5);
let tg = 'rien à envoyer';
if (hot.length) {
  const tok = process.env.TG_TOKEN, chat = process.env.TG_CHAT;
  if (!tok || !chat) tg = 'non configurée';
  else {
    const txt = hot.map(d => {
      const { f, eng } = ficheFor(d.titre);
      const pct = Math.round((d.cote - d.prix - d.frais) / d.cote * 100);
      const fm = familleFor(d.titre, d.places);
      return [`🚨 AFFAIRE AUTO — ${d.titre}`, fm.s >= 2 ? `👨‍👩‍👧‍👦 ${fm.s === 3 ? 'Idéal famille' : 'Famille OK'} : ${fm.n}` : '', `${d.annee} · ${d.km.toLocaleString('fr-FR')} km · ${d.ville}`, `${eur(d.prix)} (−${pct} % sous la cote ~${eur(d.cote)}, frais compris)`,
        eng[0] ? '⚙ ' + eng[0] : (f ? '⚙ ' + f.faibles[0] : ''), f ? `💶 Revente ${'●'.repeat(f.r)}${'○'.repeat(5 - f.r)} · Fiabilité ${'●'.repeat(f.f)}${'○'.repeat(5 - f.f)}` : '', d.url].filter(Boolean).join('\n');
    }).join('\n\n') + `\n\n${SITE}auto.html`;
    try {
      const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: txt, disable_web_page_preview: false }) });
      tg = r.ok ? `envoyée (${hot.length})` : 'erreur HTTP ' + r.status;
      if (r.ok) hot.forEach(d => alerted.add(d.id));
    } catch (e) { tg = 'erreur ' + e.message; }
  }
}

mkdirSync('site/data', { recursive: true });
writeFileSync('site/data/auto.json', JSON.stringify({
  updated: new Date(now).toISOString(), cfg: CFG, stats: { lues: listings.length, candidates, nouvelles: fresh.length, requetes: requests },
  errors: errors.slice(0, 20), deals, refs, alerted: [...alerted].slice(-1000)
}));
console.log(`Annonces lues : ${listings.length} · candidates : ${candidates} · nouvelles affaires : ${fresh.length} · requêtes : ${requests}`);
console.log('Alerte Telegram : ' + tg);
if (errors.length) console.log('Erreurs :\n' + errors.join('\n'));
