// Radar · fusion Leboncoin — lancé par les workflows GitHub.
// site/data/lbc.json = dernier lot d'annonces Leboncoin déposé depuis le navigateur de Wahib (Leboncoin bloque les serveurs).
// Fusionne ce lot dans site/data/lbc-all.json (publié) et envoie une alerte Telegram pour chaque très bonne affaire jamais signalée.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const CFG = { seuil: 30, budget: 15000, annee: 2022, kmmax: 100000, ...JSON.parse(readFileSync('auto-config.json', 'utf8')) };
const SITE = 'https://fertri2.github.io/Radar-crypto/';
const { ficheFor } = new Function(readFileSync('site/auto-fiches.js', 'utf8') + ';return { ficheFor };')();
const read = f => { try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch (_) { return null; } };

const batch = read('site/data/lbc.json') || { deals: [] };
const prev = read('site/data/lbc-all.json') || { deals: [], alerted: [] };
const now = Date.now();
const known = new Set(prev.deals.map(d => d.id));
const fresh = (batch.deals || []).filter(d => d && d.id && !known.has(d.id));
const deals = [...fresh, ...prev.deals].filter(d => now - Date.parse(d.detecteLe) < 21 * 864e5).slice(0, 800);

const alerted = new Set(prev.alerted || []);
const pct = d => Math.round((d.cote - d.prix - d.frais) / d.cote * 100);
const hot = deals.filter(d => !alerted.has(d.id) && !(d.signaux || []).length && pct(d) >= CFG.seuil
  && d.prix <= CFG.budget && (d.annee || 0) >= CFG.annee && d.km <= CFG.kmmax && now - Date.parse(d.detecteLe) < 2 * 864e5).slice(0, 5);
const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';
let tg = 'rien à envoyer';
if (hot.length) {
  const tok = process.env.TG_TOKEN, chat = process.env.TG_CHAT;
  if (!tok || !chat) tg = 'non configurée';
  else {
    const txt = hot.map(d => {
      const { f, eng } = ficheFor(d.titre);
      return [`🚨 AFFAIRE LEBONCOIN — ${d.titre}`, `${d.annee} · ${(+d.km).toLocaleString('fr-FR')} km · ${d.ville} · ${d.source === 'pro' ? 'pro' : 'particulier'}`,
        `${eur(d.prix)} (−${pct(d)} % sous l'estimation Leboncoin ${eur(d.coteMin)}–${eur(d.coteMax)}, frais compris)`,
        eng[0] ? '⚙ ' + eng[0] : (f ? '⚙ ' + f.faibles[0] : ''), f ? `💶 Revente ${'●'.repeat(f.r)}${'○'.repeat(5 - f.r)} · Fiabilité ${'●'.repeat(f.f)}${'○'.repeat(5 - f.f)}` : '', d.url].filter(Boolean).join('\n');
    }).join('\n\n') + `\n\n${SITE}auto.html`;
    try {
      const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: txt }) });
      tg = r.ok ? `envoyée (${hot.length})` : 'erreur HTTP ' + r.status;
      if (r.ok) hot.forEach(d => alerted.add(d.id));
    } catch (e) { tg = 'erreur ' + e.message; }
  }
}

mkdirSync('site/data', { recursive: true });
writeFileSync('site/data/lbc-all.json', JSON.stringify({ updated: new Date(now).toISOString(), lot: batch.when || null, lues: batch.lues || 0, deals, alerted: [...alerted].slice(-2000) }));
console.log(`Leboncoin : ${fresh.length} nouvelles annonces fusionnées, ${deals.length} suivies. Alerte Telegram : ${tg}`);
