// Radar · scan Leboncoin — exécuté dans le navigateur de Wahib, sur un onglet leboncoin.fr (Leboncoin bloque les serveurs).
// Lit les annonces voitures les plus récentes, garde celles nettement sous l'estimation de prix Leboncoin,
// puis balaie chaque recherche ciblée (recherches/*.json) ; renvoie un JSON { when, lues, bloque, deals, recherche } à déposer dans site/data/lbc.json.
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

  // ── Recherches ciblées (fichiers recherches/*.json du dépôt) : toutes les annonces du modèle, avec les signaux de fiabilité
  const recherche = [];
  let rechLues = 0;
  const nz = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const tk = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s,;]+/).filter(Boolean);
  const defs = [];
  try {
    const ls = await fetch('https://api.github.com/repos/fertri2/Radar-crypto/contents/recherches?ref=main').then(r => r.ok ? r.json() : []);
    for (const f of (Array.isArray(ls) ? ls : []).filter(f => /\.json$/.test(f.name)).slice(0, 15)) {
      try { const d = await fetch(f.download_url + '?t=' + Date.now()).then(r => r.json()); if (d && (d.marque || d.modele)) defs.push({ ...d, id: d.id || f.name.replace(/\.json$/, '') }); } catch (_) {}
    }
  } catch (_) {}
  const LF = { essence: 1, diesel: 2, gpl: 3, electrique: 4, hybride: 6, hybride_rechargeable: 7 };
  const byId = {};
  for (const r of defs) {
    if (bloque) break;
    const q = new URLSearchParams({ category: '2', text: [r.marque, r.modele, r.motsCles].filter(Boolean).join(' ') });
    if (r.anneeMin || r.anneeMax) q.set('regdate', `${r.anneeMin || 'min'}-${r.anneeMax || 'max'}`);
    if (r.kmMax) q.set('mileage', `min-${r.kmMax}`);
    if (r.prixMin || r.prixMax) q.set('price', `${r.prixMin || 'min'}-${r.prixMax || 'max'}`);
    if (LF[r.carburant]) q.set('fuel', LF[r.carburant]);
    if (r.boite) q.set('gearbox', r.boite === 'auto' ? '2' : '1');
    if (r.vendeur) q.set('owner_type', r.vendeur === 'pro' ? 'pro' : 'private');
    q.set('sort', 'time'); q.set('order', 'desc');
    let n = 0;
    for (let p = 1; p <= 3 && n < 60; p++) {
      let sd;
      try {
        const h = await fetch('/recherche?' + q + '&page=' + p).then(r => r.text());
        const m = h.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
        if (!m) { bloque++; break; }
        sd = JSON.parse(m[1]).props.pageProps.searchData;
      } catch (e) { bloque++; break; }
      const ads = (sd && sd.ads) || [];
      for (const a of ads) {
        rechLues++;
        const marque = g(a, 'brand') || '', modele = g(a, 'model') || '', version = g(a, 'u_car_version') || '';
        const big = nz([marque, modele, g(a, 'u_car_model'), a.subject, version].join(' '));
        if (r.marque && !big.includes(nz(r.marque).replace(/benz$/, ''))) continue;
        if (r.modele && !big.includes(nz(r.modele))) continue;
        const words = [marque, modele, a.subject, version, g(a, 'u_car_finition')].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (tk(r.motsCles).some(k => !words.includes(k)) || tk(r.exclure).some(k => words.includes(k))) continue;
        const ch = +g(a, 'horse_power_din') || 0, places = +g(a, 'seats') || 0;
        if (r.chMin && ch && ch < r.chMin) continue;
        if (r.placesMin && places && places < r.placesMin) continue;
        const id = 'lbc-' + a.list_id;
        if (byId[id]) { if (!byId[id].rech.includes(r.id)) byId[id].rech.push(r.id); continue; }
        const prix = (a.price || [])[0]; if (!prix) continue;
        const mn = +g(a, 'car_price_min') || 0, mx = +g(a, 'car_price_max') || 0, cote = mn && mx ? Math.round((mn + mx) / 2) : 0;
        const annee = +g(a, 'regdate') || null, km = +g(a, 'mileage') || 0;
        const txt = ((a.subject || '') + ' ' + (a.body || '')).toLowerCase();
        const signaux = [], atouts = [];
        if (cote && (cote - prix) / cote > 0.45) signaux.push('prixanormal');
        if (/[ée]tranger|expatri|mutation|transporteur|livraison partout/.test(txt)) signaux.push('etranger');
        if (/acompte|r[ée]servation|mandat cash|western|transcash|paysafe/.test(txt)) signaux.push('acompte');
        if (/urgent|d[ée]part imm[ée]diat/.test(txt)) signaux.push('urgent');
        if (/whatsapp|contactez.{0,20}(mail|e-mail)|@[a-z0-9-]+\.[a-z]{2,}/.test(txt)) signaux.push('horsplateforme');
        if (prix < 1500 || /mensualit|par mois|\bloa\b|\blld\b|apport/.test(txt)) signaux.push('appat');
        if (((a.images && a.images.nb_images) || 0) < 4) signaux.push('photos');
        const age = annee ? Math.max(0, new Date().getFullYear() - annee) : 0;
        if (age >= 2 && km && km / age < 2500) signaux.push('km');
        const dmg = g(a, 'vehicle_damage') || '';
        if (dmg && dmg !== 'undamaged' && /damag|accident|broken|repair|panne|sinist|non_rolling/.test(dmg)) signaux.push('sinistre');
        const lab = k => ((a.attributes || []).find(x => x.key === k) || {}).value_label || '';
        if (g(a, 'vehicle_history_report_status') === 'visible' || g(a, 'vehicle_history_report_public_url')) atouts.push('histovec');
        if (g(a, 'vehicle_technical_inspection_valid') === 'true') atouts.push('ct');
        if (g(a, 'vehicle_commercial_warranty') === 'true' || g(a, 'ad_warranty_type')) atouts.push('garantie');
        if (/carnet|factures/i.test(lab('vehicle_maintenance'))) atouts.push('carnet');
        if (/premi[eè]re main/i.test(lab('vehicle_history'))) atouts.push('premieremain');
        const raw = +g(a, 'rating_score') || 0, note = raw > 1 ? raw / 5 : raw, avis = +g(a, 'rating_count') || 0;
        if (note >= 0.9 && avis >= 3) atouts.push('vendeurnote');
        const old = +g(a, 'old_price') || 0;
        const titre = (version && !version.toLowerCase().startsWith(marque.toLowerCase()) ? marque + ' ' + version : version || a.subject || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        const ad = {
          id, site: 'lbc', rech: [r.id], titre, marque, modele, places, ch, annee, km, prix, cote, coteMin: mn, coteMax: mx, ancienPrix: old > prix ? old : 0,
          frais: 300, source: a.owner && a.owner.type === 'pro' ? 'pro' : 'particulier', ville: `${(a.location && (a.location.city_label || a.location.city)) || ''} (FR)`,
          url: a.url, carburant: FUEL[g(a, 'fuel')] || '', boite: g(a, 'gearbox') === '2' ? 'Automatique' : g(a, 'gearbox') === '1' ? 'Manuelle' : '',
          carrosserie: g(a, 'vehicle_type') === '4x4' ? 'SUV' : '', label: g(a, 'car_price_positioning') || '', signaux, atouts,
          note: avis ? Math.round(note * 50) / 10 : 0, avis, photo: (a.images && a.images.thumb_url) || '', publie: a.first_publication_date || '', detecteLe: now
        };
        byId[id] = ad; recherche.push(ad); n++;
      }
      if (ads.length < 30) break;
      await new Promise(r => setTimeout(r, 900));
    }
  }
  return JSON.stringify({ when: now, lues, bloque, deals, rechLues, recherches: defs.map(d => d.id), recherche });
})()
