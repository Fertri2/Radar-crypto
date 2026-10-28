// Radar · recherches ciblées — lancé par GitHub Actions (scan-auto.yml toutes les heures et à chaque nouvelle recherche, lbc-alert.yml à chaque lot Leboncoin).
// 1) Lit les recherches du dépôt (recherches/*.json : marque, modèle, années, km, prix, carburant, boîte, vendeur…).
// 2) AutoScout24 (sauf RECH_AS24=0) : toutes les annonces du modèle, cote estimée sur annonces comparables, signaux de fiabilité.
// 3) Fusionne les annonces Leboncoin du dernier lot déposé depuis le navigateur (site/data/lbc.json → champ « recherche »).
// 4) Écrit site/data/rech.json et alerte sur Telegram pour chaque nouvelle annonce fiable au prix du marché ou en dessous.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

const SITE = 'https://fertri2.github.io/Radar-crypto/';
const AS = 'https://www.autoscout24.fr';
const HEADERS = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'accept-language': 'fr-FR,fr;q=0.9', accept: 'text/html,application/xhtml+xml' };
const R = new Function(readFileSync('site/auto-recherche.js', 'utf8') + ';return { matchRech, as24Url, rFuel, rGear, rNorm };')();
const { ficheFor } = new Function(readFileSync('site/auto-fiches.js', 'utf8') + ';return { ficheFor };')();
const read = f => { try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch (_) { return null; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const now = Date.now(), nowIso = new Date(now).toISOString();
let requests = 0;

// Recherches
const defs = [];
if (existsSync('recherches')) for (const f of readdirSync('recherches').filter(f => f.endsWith('.json')).sort()) {
  const d = read('recherches/' + f);
  if (d && (d.marque || d.modele)) defs.push({ ...d, id: d.id || f.replace(/\.json$/, '') });
  else errors.push('Recherche illisible : ' + f);
}
const ids = new Set(defs.map(d => d.id));
const prev = read('site/data/rech.json') || { annonces: [], refs: {}, alerted: [], stats: {} };

async function page(url) {
  for (let a = 0; a < 3; a++) {
    try {
      requests++;
      const r = await fetch(url, { headers: HEADERS });
      if (r.status === 429 || r.status === 403) { await sleep(4000 * (a + 1)); continue; }
      if (r.status === 404) return { listings: [] };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const m = (await r.text()).match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!m) throw new Error('données absentes');
      return JSON.parse(m[1]).props.pageProps;
    } catch (e) { if (a === 2) throw e; await sleep(1500); }
  }
  throw new Error('bloqué (403/429)');
}

// Cote AutoScout24 : médiane d'annonces comparables (même modèle, année, carburant), ajustée au km
const refs = {};
for (const [k, v] of Object.entries(prev.refs || {})) if (now - v.t < 36 * 3600e3) refs[k] = v;
const med = a => { a = [...a].sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : NaN; };
async function comps(key) {
  if (refs[key]) return refs[key].c;
  const [m, mo, y, f] = key.split('|');
  const out = [];
  for (const p of [1, 2]) {
    try {
      const pp = await page(`${AS}/lst?mmmv=${m}|${mo}||&fregfrom=${y}&fregto=${y}&fuel=${f.toUpperCase()}&cy=F,B,L,D&atype=C&ustate=N,U&page=${p}`);
      for (const x of pp.listings || []) if (String(x.vehicle?.modelId) === mo && !/toolow|too-low/.test(x.tracking?.priceLabel || '')) out.push([x.price.priceRaw, +x.tracking.mileage]);
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
    return my + b * (km - mx) + med(cs.map(c => c[0] - (my + b * (c[1] - mx))));
  }
  const near = cs.filter(c => Math.abs(c[1] - km) <= 25000);
  return near.length >= 5 ? med(near.map(c => c[0])) : 0;
}

const fresh = {}; // id → annonce vue à ce passage
const stats = {};
for (const r of defs) stats[r.id] = { as24: 0, lbc: (prev.stats?.[r.id]?.lbc) || 0, lbcLe: prev.stats?.[r.id]?.lbcLe || null };

// AutoScout24
if (process.env.RECH_AS24 !== '0') {
  const yr = x => +(x.tracking?.firstRegistration || '').split('-')[1];
  const mk = x => (x.tracking?.modelTaxonomy?.match(/make_id:(\d+)/) || [])[1];
  for (const r of defs.slice(0, 12)) {
    let list = [];
    for (const withModel of r.modele ? [true, false] : [false]) {
      for (let p = 1; p <= 3; p++) {
        try {
          const pp = await page(R.as24Url(r, withModel) + '&page=' + p);
          const L = pp.listings || [];
          list.push(...L);
          if (L.length < 20) break;
        } catch (e) { errors.push(`AS24 ${r.id} p${p} : ${e.message}`); break; }
        await sleep(700);
      }
      if (list.length) break; // le chemin marque/modèle a marché
    }
    for (const x of list) {
      const id = 'as24-' + x.id.slice(0, 8);
      const v = x.vehicle || {};
      const cc = x.location?.countryCode || '?';
      const titre = `${v.make || ''} ${v.model || ''} ${v.modelVersionInput || v.motorTypeName || ''}`.replace(/\s+/g, ' ').trim().slice(0, 80);
      const ad = {
        id, site: 'as24', titre, marque: v.make || '', modele: v.model || '', annee: yr(x) || null, km: +x.tracking?.mileage || 0, prix: x.price?.priceRaw || 0,
        carburant: v.fuel || '', boite: v.transmission || '', source: cc !== 'FR' ? 'import' : (x.seller?.type === 'Dealer' ? 'pro' : 'particulier'),
        ville: `${(x.location?.city || '').trim()} (${cc})`, url: AS + x.url, photo: (x.images || [])[0] || '', label: (x.tracking?.priceLabel || '').trim(),
        nbPhotos: (x.images || []).length, endommage: !!v.isCurrentlyDamaged
      };
      if (!ad.prix || !R.matchRech(r, ad)) continue;
      if (fresh[id]) { if (!fresh[id].rech.includes(r.id)) fresh[id].rech.push(r.id); continue; }
      const old = (prev.annonces || []).find(a => a.id === id);
      let c = old && old.cote && old.prix === ad.prix ? old.cote : 0;
      const key = `${mk(x)}|${v.modelId}|${ad.annee}|${x.tracking?.fuelType}`;
      if (!c && !key.includes('undefined')) c = Math.round(cote(await comps(key), ad.km) / 10) * 10 || 0;
      const imp = cc !== 'FR';
      const signaux = [], atouts = [];
      if (/toolow|too-low/.test(ad.label) || (c && (c - ad.prix) / c > 0.45)) signaux.push('prixanormal');
      if (/apport|par-mois|mensualit|leasing/i.test(x.url + ' ' + (v.modelVersionInput || ''))) signaux.push('appat');
      if (ad.nbPhotos < 4) signaux.push('photos');
      if (ad.endommage) signaux.push('sinistre');
      const age = ad.annee ? Math.max(0, new Date().getFullYear() - ad.annee) : 0;
      if (age >= 2 && ad.km && ad.km / age < 2500) signaux.push('km');
      if (/top|good/.test(ad.label)) atouts.push('prixas24');
      if (ad.source === 'pro') atouts.push('pro');
      fresh[id] = {
        ...ad, rech: [r.id], cote: c, frais: imp ? (ad.source === 'pro' ? 700 : 900) : 300, signaux, atouts,
        ancienPrix: old && old.prix > ad.prix ? old.prix : (old?.ancienPrix || 0), detecteLe: old?.detecteLe || nowIso, vuLe: nowIso
      };
      delete fresh[id].nbPhotos; delete fresh[id].endommage;
      stats[r.id].as24++;
    }
  }
}

// Leboncoin : annonces du dernier lot déposé depuis le navigateur
const lot = read('site/data/lbc.json') || {};
if (Array.isArray(lot.recherche)) {
  for (const r of defs) if ((lot.recherches || []).includes(r.id)) { stats[r.id].lbc = 0; stats[r.id].lbcLe = lot.when; }
  for (const a of lot.recherche) {
    if (!a || !a.id) continue;
    a.rech = (a.rech || []).filter(x => ids.has(x) && R.matchRech(defs.find(d => d.id === x), a));
    if (!a.rech.length) continue;
    const old = (prev.annonces || []).find(o => o.id === a.id);
    fresh[a.id] = { ...a, ancienPrix: a.ancienPrix || (old && old.prix > a.prix ? old.prix : old?.ancienPrix || 0), detecteLe: old?.detecteLe || a.detecteLe || nowIso, vuLe: lot.when || nowIso };
    for (const x of a.rech) if (stats[x] && (lot.recherches || []).includes(x)) stats[x].lbc++;
  }
}

// Fusion : nouvelles + anciennes encore valables (30 jours, recherche toujours active, toujours conforme aux critères)
const asRan = process.env.RECH_AS24 !== '0';
const keep = (prev.annonces || []).filter(a => !fresh[a.id] && now - Date.parse(a.vuLe || a.detecteLe) < (a.site === 'as24' ? (asRan ? 2 : 3) : 7) * 864e5)
  .map(a => ({ ...a, rech: (a.rech || []).filter(x => ids.has(x) && R.matchRech(defs.find(d => d.id === x), a)) })).filter(a => a.rech.length);
const annonces = [...Object.values(fresh), ...keep].slice(0, 1500);

// Alertes Telegram
const alerted = new Set(prev.alerted || []);
const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';
const pct = a => a.cote ? Math.round((a.cote - a.prix - (a.frais || 0)) / a.cote * 100) : null;
const hot = Object.values(fresh).filter(a => !alerted.has(a.id) && !(a.signaux || []).length && now - Date.parse(a.detecteLe) < 2 * 864e5
  && a.rech.some(x => { const d = defs.find(z => z.id === x); return d && d.alerte !== false && (a.cote ? pct(a) >= (d.alerteDecote ?? 0) : !d.alerteDecote); }))
  .sort((a, b) => (a.site === 'lbc' ? 0 : 1) - (b.site === 'lbc' ? 0 : 1) || (pct(b) ?? -99) - (pct(a) ?? -99));
let tg = 'rien à envoyer';
if (hot.length) {
  const tok = process.env.TG_TOKEN, chat = process.env.TG_CHAT;
  if (!tok || !chat) tg = 'non configurée';
  else {
    const top = hot.slice(0, 6);
    const txt = top.map(a => {
      const d = defs.find(z => a.rech.includes(z.id));
      const { f } = ficheFor(a.titre);
      const p = pct(a);
      return [`🎯 RECHERCHE « ${d?.nom || ''} » — ${a.site === 'lbc' ? 'Leboncoin' : 'AutoScout24'}`, a.titre, `${a.annee || '?'} · ${(+a.km).toLocaleString('fr-FR')} km · ${a.ville} · ${a.source}`,
        `${eur(a.prix)}${p != null ? ` (${p >= 0 ? '−' : '+'}${Math.abs(p)} % vs cote ~${eur(a.cote)}, frais compris)` : ''}${a.ancienPrix ? ` · baisse depuis ${eur(a.ancienPrix)}` : ''}`,
        (a.atouts || []).length ? '✅ ' + a.atouts.join(', ') : '', f ? `Fiabilité modèle ${'●'.repeat(f.f)}${'○'.repeat(5 - f.f)}` : '', a.url].filter(Boolean).join('\n');
    }).join('\n\n') + (hot.length > top.length ? `\n\n+ ${hot.length - top.length} autres` : '') + `\n\n${SITE}auto.html#recherche`;
    try {
      const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: txt }) });
      tg = r.ok ? `envoyée (${top.length})` : 'erreur HTTP ' + r.status;
      if (r.ok) hot.forEach(a => alerted.add(a.id));
    } catch (e) { tg = 'erreur ' + e.message; }
  }
}

mkdirSync('site/data', { recursive: true });
writeFileSync('site/data/rech.json', JSON.stringify({
  updated: nowIso, as24Le: process.env.RECH_AS24 === '0' ? prev.as24Le || null : nowIso, lbcLot: lot.when || prev.lbcLot || null,
  recherches: defs, stats, annonces, refs, alerted: [...alerted].slice(-3000), errors: errors.slice(0, 20), requetes: requests
}));
console.log(`Recherches : ${defs.length} · annonces suivies : ${annonces.length} · vues ce passage : ${Object.keys(fresh).length} · requêtes : ${requests}`);
console.log('Alerte Telegram : ' + tg);
if (errors.length) console.log('Erreurs :\n' + errors.join('\n'));
