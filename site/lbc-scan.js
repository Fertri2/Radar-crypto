// Radar · scan Leboncoin — exécuté dans le navigateur de Wahib, sur un onglet leboncoin.fr (Leboncoin bloque les serveurs).
// Lit les annonces voitures les plus récentes, garde celles nettement sous l'estimation de prix Leboncoin,
// et renvoie un JSON { when, lues, bloque, deals } à déposer dans site/data/lbc.json du dépôt.
(async () => {
  const C = { seuil: 30, budget: 15000, annee: 2022, kmmax: 100000, decoteMin: 18 };
  try { Object.assign(C, await fetch('https://raw.githubusercontent.com/fertri2/Radar-crypto/main/auto-config.json?t=' + Date.now()).then(r => r.json())); } catch (_) {}
  const pages = +(window.LBC_PAGES || 12);
  let seen;
  try { seen = new Set(JSON.parse(localStorage.getItem('radarLbcSeen') || '[]')); } catch (_) { seen = new Set(); }
  const g = (a, k) => ((a.attributes || []).find(x => x.key === k) || {}).value;
  const FUEL = { 1: 'Essence', 2: 'Diesel', 3: 'GPL', 4: 'Électrique', 5: 'Autre', 6: 'Hybride', 7: 'Hybride rechargeable' };
  const base = `/recherche?category=2&regdate=${C.annee}-max&mileage=min-${C.kmmax}&price=min-${Math.round(C.budget * 1.3)}&sort=time&order=desc`;
  const now = new Date().toISOString();
  const deals = [];
  let lues = 0, bloque = 0;
  for (let p = 1; p <= pages; p++) {
    let sd;
    try {
      const h = await fetch(base + '&page=' + p).then(r => r.text());
      const m = h.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!m) { bloque++; break; }
      sd = JSON.parse(m[1]).props.pageProps.searchData;
    } catch (e) { bloque++; break; }
    const ads = (sd && sd.ads) || [];
    if (!ads.length) break;
    let neuves = 0;
    for (const a of ads) {
      lues++;
      const id = 'lbc-' + a.list_id;
      if (seen.has(id)) continue;
      seen.add(id); neuves++;
      const prix = (a.price || [])[0], mn = +g(a, 'car_price_min'), mx = +g(a, 'car_price_max');
      if (!prix || !mn || !mx) continue;
      const cote = Math.round((mn + mx) / 2);
      const dec = (cote - prix) / cote * 100;
      let marque = g(a, 'brand') || '';
      if (/^autres?$/i.test(marque)) marque = (g(a, 'u_car_brand') || '').replace(/_/g, ' ');
      const version = g(a, 'u_car_version') || a.subject || '';
      if (version.toLowerCase().startsWith(marque.toLowerCase())) marque = '';
      const titre = `${marque} ${version}`.replace(/\s+/g, ' ').trim().slice(0, 80);
      const places = +g(a, 'seats') || 0;
      const familiale = places >= 7 || ['4x4', 'monospace', 'break'].includes(g(a, 'vehicle_type')) || /5008|kodiaq|jogger|sorento|santa fe|x-trail|outlander|tarraco|allspace|c5 aircross|espace|berlingo|rifter|kangoo|touran|spacetourer|3008|sportage|tucson|rav4|austral|tiguan|karoq|kuga|qashqai|ateca|grandland|cx-5|duster/i.test(titre);
      if (dec < (familiale ? (C.decoteMinFamille ?? 12) : C.decoteMin)) continue;
      const txt = (a.subject || '') + ' ' + (a.body || '');
      const signaux = [];
      if (dec > 45) signaux.push('prixanormal');
      if (/[ée]tranger|expatri|mutation|transporteur|livraison partout/i.test(txt)) signaux.push('etranger');
      if (/acompte|r[ée]servation|mandat|western|transcash|paysafe/i.test(txt)) signaux.push('acompte');
      if (/urgent|vite|d[ée]part imm[ée]diat/i.test(txt)) signaux.push('urgent');
      deals.push({
        id, site: 'lbc', titre, places, annee: +g(a, 'regdate') || null, km: +g(a, 'mileage') || 0, prix, cote, coteMin: mn, coteMax: mx,
        frais: 300, source: a.owner && a.owner.type === 'pro' ? 'pro' : 'particulier',
        ville: `${(a.location && (a.location.city_label || a.location.city)) || ''} (FR)`, url: a.url,
        carburant: FUEL[g(a, 'fuel')] || '', carrosserie: g(a, 'vehicle_type') === '4x4' ? 'SUV' : '',
        label: g(a, 'car_price_positioning') || '', signaux, photo: (a.images && a.images.thumb_url) || '',
        publie: a.first_publication_date || '', detecteLe: now
      });
    }
    if (!neuves && p > 2) break;
    await new Promise(r => setTimeout(r, 900));
  }
  try { localStorage.setItem('radarLbcSeen', JSON.stringify([...seen].slice(-8000))); } catch (_) {}
  return JSON.stringify({ when: now, lues, bloque, deals });
})()
