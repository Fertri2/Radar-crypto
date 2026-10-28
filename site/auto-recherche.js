// Radar · recherche ciblée — partagé entre le site (auto.html) et les scans GitHub (scan-recherches.mjs).
// Une recherche = un fichier recherches/<id>.json du dépôt : marque, modèle, années, km, prix, carburant, boîte…
const RECH_REPO = 'fertri2/Radar-crypto';
const rNorm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
const rSlug = s => rNorm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rTokens = s => rNorm(s).split(/[\s,;]+/).filter(Boolean);
const rCompact = s => rNorm(s).replace(/[^a-z0-9]/g, '');

// Carburant / boîte ramenés à des codes communs
function rFuel(s) {
  const t = rNorm(s);
  if (!t) return '';
  if (/rechargeable|plug|phev/.test(t)) return 'hybride_rechargeable';
  if (/hybride|hybrid|electrique\/|\/electrique|electrique \/|mhev|hev/.test(t)) return 'hybride';
  if (/electrique|electric|elektro/.test(t)) return 'electrique';
  if (/diesel/.test(t)) return 'diesel';
  if (/gpl|lpg/.test(t)) return 'gpl';
  if (/essence|benzin|petrol/.test(t)) return 'essence';
  return 'autre';
}
function rGear(s) { const t = rNorm(s); return /auto|dsg|eat|bva|cvt|edc/.test(t) ? 'auto' : /manuel/.test(t) ? 'manuelle' : ''; }
const R_FUEL_LABEL = { '': 'Tous', essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride', hybride_rechargeable: 'Hybride rechargeable', electrique: 'Électrique', gpl: 'GPL' };

// Une annonce correspond-elle à la recherche ? ad = { titre, marque, modele, annee, km, prix, carburant, boite, source, ch, places, ville }
function matchRech(r, ad) {
  if (!r || !ad) return false;
  const txt = rCompact([ad.marque, ad.modele, ad.titre].join(' '));
  if (r.marque && !txt.includes(rCompact(r.marque).replace(/benz$/, ''))) return false;
  if (r.modele && !txt.includes(rCompact(r.modele))) return false;
  const full = rNorm([ad.marque, ad.modele, ad.titre].join(' '));
  for (const k of rTokens(r.motsCles)) if (!full.includes(k)) return false;
  for (const k of rTokens(r.exclure)) if (full.includes(k)) return false;
  if (r.anneeMin && ad.annee && ad.annee < r.anneeMin) return false;
  if (r.anneeMax && ad.annee && ad.annee > r.anneeMax) return false;
  if (r.kmMax && ad.km > r.kmMax) return false;
  if (r.prixMin && ad.prix < r.prixMin) return false;
  if (r.prixMax && ad.prix > r.prixMax) return false;
  if (r.carburant && ad.carburant) { const f = rFuel(ad.carburant); if (f !== r.carburant && !(f.startsWith('hybride') && r.carburant.startsWith('hybride'))) return false; }
  if (r.boite && ad.boite && rGear(ad.boite) !== r.boite) return false;
  if (r.vendeur === 'particulier' && ad.source && ad.source !== 'particulier' && ad.source !== 'import') return false;
  if (r.vendeur === 'pro' && ad.source === 'particulier') return false;
  if (r.chMin && ad.ch && ad.ch < r.chMin) return false;
  if (r.placesMin && ad.places && ad.places < r.placesMin) return false;
  if (r.pays && ad.ville) { const cc = (ad.ville.match(/\(([A-Z]{2})\)\s*$/) || [])[1]; const map = { FR: 'F', BE: 'B', LU: 'L', DE: 'D' }; if (cc && !r.pays.split(',').includes(map[cc] || cc)) return false; }
  return true;
}

// Paramètres Leboncoin (vérifiés sur le site : text, regdate, mileage, price, fuel, gearbox, owner_type)
const R_LBC_FUEL = { essence: 1, diesel: 2, gpl: 3, electrique: 4, hybride: 6, hybride_rechargeable: 7 };
function lbcQuery(r) {
  const q = new URLSearchParams({ category: '2', text: [r.marque, r.modele, r.motsCles].filter(Boolean).join(' ').trim() });
  if (r.anneeMin || r.anneeMax) q.set('regdate', `${r.anneeMin || 'min'}-${r.anneeMax || 'max'}`);
  if (r.kmMax) q.set('mileage', `min-${r.kmMax}`);
  if (r.prixMin || r.prixMax) q.set('price', `${r.prixMin || 'min'}-${r.prixMax || 'max'}`);
  if (R_LBC_FUEL[r.carburant]) q.set('fuel', R_LBC_FUEL[r.carburant]);
  if (r.boite) q.set('gearbox', r.boite === 'auto' ? '2' : '1');
  if (r.vendeur) q.set('owner_type', r.vendeur === 'pro' ? 'pro' : 'private');
  q.set('sort', 'time'); q.set('order', 'desc');
  return q.toString();
}

// AutoScout24 : /lst/<marque>/<modele>?…
const R_AS_FUEL = { essence: 'B', diesel: 'D', electrique: 'E', gpl: 'L', hybride: '2,3', hybride_rechargeable: '2,3' };
function as24Url(r, withModel = true) {
  const p = new URLSearchParams({ atype: 'C', ustate: 'N,U', cy: r.pays || 'F,B,L,D', sort: 'age', desc: '1' });
  if (r.anneeMin) p.set('fregfrom', r.anneeMin); if (r.anneeMax) p.set('fregto', r.anneeMax);
  if (r.kmMax) p.set('kmto', r.kmMax); if (r.prixMin) p.set('pricefrom', r.prixMin); if (r.prixMax) p.set('priceto', r.prixMax);
  if (R_AS_FUEL[r.carburant]) p.set('fuel', R_AS_FUEL[r.carburant]);
  if (r.boite) p.set('gear', r.boite === 'auto' ? 'A' : 'M');
  if (r.vendeur) p.set('custtype', r.vendeur === 'pro' ? 'D' : 'P');
  if (r.chMin) { p.set('powerfrom', r.chMin); p.set('powertype', 'hp'); }
  const path = [rSlug(r.marque), withModel ? rSlug(r.modele) : ''].filter(Boolean).join('/');
  return `https://www.autoscout24.fr/lst${path ? '/' + path : ''}?${p}`;
}

// Liens prêts à l'emploi vers tous les sites, avec les mêmes filtres
function rechLinks(r) {
  const mk = rSlug(r.marque), mo = rSlug(r.modele), MK = (r.marque || '').toUpperCase().replace(/\s+/g, '-'), MO = (r.modele || '').toUpperCase();
  const lcE = { essence: 'ess', diesel: 'dies', electrique: 'elec', hybride: 'hyb', hybride_rechargeable: 'plug_hyb', gpl: 'gpl' }[r.carburant];
  const lc = new URLSearchParams();
  if (MK) lc.set('makesModelsCommercialNames', MK + (MO ? ':' + MO : ''));
  if (r.anneeMin) lc.set('yearMin', r.anneeMin); if (r.anneeMax) lc.set('yearMax', r.anneeMax);
  if (r.kmMax) lc.set('mileageMax', r.kmMax); if (r.prixMin) lc.set('priceMin', r.prixMin); if (r.prixMax) lc.set('priceMax', r.prixMax);
  if (lcE) lc.set('energies', lcE); if (r.boite) lc.set('gearbox', r.boite === 'auto' ? 'AUTO' : 'MANUAL');
  if (r.vendeur) lc.set('customerFamilyCodes', r.vendeur === 'pro' ? 'CONCESSIONNAIRE,AGENT,GARAGE,REVENDEUR' : 'PARTICULIER');
  if (r.chMin) lc.set('powerDINMin', r.chMin);
  const md = new URLSearchParams({ isSearchRequest: 'true', s: 'Car', vc: 'Car', dam: 'false', ref: 'srp' });
  if (r.anneeMin || r.anneeMax) md.set('fr', `${r.anneeMin || ''}:${r.anneeMax || ''}`);
  if (r.kmMax) md.set('ml', ':' + r.kmMax); if (r.prixMin || r.prixMax) md.set('p', `${r.prixMin || ''}:${r.prixMax || ''}`);
  const g = encodeURIComponent([r.marque, r.modele, r.motsCles].filter(Boolean).join(' ') + (r.anneeMin ? ' ' + r.anneeMin : '') + ' occasion');
  return [
    ['Leboncoin', 'https://www.leboncoin.fr/recherche?' + lbcQuery(r), 'Priorité · scanné depuis ton PC'],
    ['AutoScout24', as24Url(r), 'Scanné toutes les heures · ' + (r.pays || 'F,B,L,D')],
    ['La Centrale', 'https://www.lacentrale.fr/listing?' + lc, 'Indicateur bonne affaire'],
    ['mobile.de', 'https://suchen.mobile.de/fahrzeuge/search.html?' + md, 'Choisis la marque sur place'],
    ['Leparking', `https://www.leparking.fr/voiture-occasion/${[mk, mo].filter(Boolean).join('-') || 'recherche'}.html`, 'Agrège des dizaines de sites'],
    ['Aramisauto', `https://www.aramisauto.com/achat/${mk ? mk + '/' : ''}${mo ? mo + '/' : ''}`, 'Pro, garantie, reprise'],
    ['Autohero', `https://www.autohero.com/fr/search/?${new URLSearchParams(Object.fromEntries([['brand', mk], ['model', mo]].filter(x => x[1])))}`, 'Pro, livraison'],
    ['Spoticar', 'https://www.spoticar.fr/voitures-occasion', 'Réseau Stellantis'],
    ['ParuVendu', `https://www.paruvendu.fr/auto-moto/listefo/default/default?r=VVO00000&md=${encodeURIComponent([r.marque, r.modele].filter(Boolean).join(' '))}`, 'Particuliers et pros'],
    ['Google (tous sites)', 'https://www.google.com/search?q=' + g, 'Le reste du web']
  ];
}

// Nouvelle recherche → fichier JSON propre
function rechClean(r) {
  const o = {};
  for (const k of ['nom', 'marque', 'modele', 'motsCles', 'exclure', 'carburant', 'boite', 'vendeur', 'pays']) if (r[k]) o[k] = String(r[k]).trim();
  for (const k of ['anneeMin', 'anneeMax', 'kmMax', 'prixMin', 'prixMax', 'chMin', 'placesMin']) if (+r[k] > 0) o[k] = Math.round(+r[k]);
  if (r.alerteDecote !== undefined && r.alerteDecote !== '' && isFinite(+r.alerteDecote) && +r.alerteDecote !== 0) o.alerteDecote = Math.round(+r.alerteDecote);
  o.alerte = r.alerte !== false;
  if (!o.nom) o.nom = [o.marque, o.modele, o.motsCles].filter(Boolean).join(' ') || 'Recherche';
  o.id = r.id || rSlug([o.marque, o.modele, o.motsCles, o.anneeMin].filter(Boolean).join(' ')).slice(0, 40) + '-' + Date.now().toString(36).slice(-4);
  return o;
}
