// Fiches modèles : r = revente (1-5), f = fiabilité (1-5), forts / faibles, conseil
const FICHES=[
 ['peugeot 2008',{r:3,f:3,forts:['Très demandé en France, se revend vite','Habitacle moderne, i-Cockpit','Consommation contenue'],faibles:['Moteur 1.2 PureTech : courroie de distribution qui baigne dans l’huile et se dégrade (risque de casse moteur)','Consommation d’huile sur certains PureTech'],conseil:'Exiger la preuve du remplacement de courroie ou l’éligibilité à l’extension de garantie Stellantis.'}],
 ['peugeot 3008',{r:4,f:3,forts:['Best-seller, très liquide à la revente','Présentation haut de gamme','Grand coffre'],faibles:['1.2 PureTech : courroie humide fragile','Boîte EAT8 sensible si vidange négligée'],conseil:'Préférer le 1.5 BlueHDi ou l’hybride si dossier d’entretien complet.'}],
 ['peugeot 5008',{r:4,f:3,forts:['7 places, rare et recherché par les familles','Revente solide'],faibles:['1.2 PureTech : courroie humide fragile','Poids élevé pour le 1.2'],conseil:'Vérifier les factures de courroie et l’historique d’huile.'}],
 ['citroen c5 aircross',{r:3,f:3,forts:['Confort de suspension','Grand coffre modulable'],faibles:['1.2 PureTech : courroie humide','Décote plus forte que le 3008'],conseil:'Acheter bas, la décote est déjà absorbée.'}],
 ['citroen c3 aircross',{r:3,f:3,forts:['Prix d’achat bas','Habitable pour sa taille'],faibles:['1.2 PureTech : courroie humide','Finition plastique'],conseil:'Bon ticket d’entrée, marge de revente limitée.'}],
 ['citroen c4',{r:2,f:3,forts:['Confort','Style crossover'],faibles:['1.2 PureTech','Décote marquée'],conseil:'Seulement très sous la cote.'}],
 ['opel crossland',{r:2,f:3,forts:['Prix bas, abondant en Allemagne','Pratique et sobre'],faibles:['1.2 PureTech (même bloc que Peugeot)','Modèle arrêté : la revente baisse'],conseil:'Beaucoup d’offres DE à bas prix, l’écart vient en partie du marché allemand.'}],
 ['opel mokka',{r:3,f:3,forts:['Design récent','Bien équipé'],faibles:['1.2 PureTech','Coffre petit'],conseil:'Vérifier l’historique de courroie.'}],
 ['opel grandland',{r:2,f:3,forts:['Spacieux','Bien équipé pour le prix'],faibles:['1.2 PureTech','Décote forte'],conseil:'Intéressant seulement très sous la cote.'}],
 ['dacia duster',{r:5,f:4,forts:['Champion de la revente, décote très faible','Mécanique simple et robuste','Pièces bon marché'],faibles:['Finition sommaire','Insonorisation moyenne'],conseil:'Un des meilleurs paris pour revendre sans perte.'}],
 ['dacia sandero',{r:5,f:4,forts:['Très liquide, se revend tout seul','Coûts d’entretien bas'],faibles:['Pas un SUV (sauf Stepway)','Équipement basique'],conseil:'Placement sûr, faible marge mais faible risque.'}],
 ['dacia spring',{r:2,f:3,forts:['Électrique le moins cher','Coût d’usage très bas en ville'],faibles:['Autonomie et puissance faibles','Note sécurité très basse','Marché de revente étroit'],conseil:'Usage urbain uniquement, revente incertaine.'}],
 ['volkswagen t-roc',{r:4,f:4,forts:['Très demandé, revente solide','1.0 et 1.5 TSI fiables'],faibles:['Boîte DSG7 à sec (DQ200) parfois capricieuse','Plastiques durs'],conseil:'Préférer boîte manuelle ou DSG avec entretien suivi.'}],
 ['volkswagen taigo',{r:3,f:4,forts:['1.0 TSI fiable et sobre','Look coupé'],faibles:['Coffre et garde au toit réduits','Moins recherché que le T-Roc'],conseil:'Bon compromis fiabilité/prix.'}],
 ['volkswagen t-cross',{r:4,f:4,forts:['Fiable, très liquide','Banquette coulissante'],faibles:['Moteur 1.0 un peu juste chargé'],conseil:'Valeur sûre en citadine haute.'}],
 ['skoda kamiq',{r:4,f:4,forts:['Mécanique VW éprouvée','Rapport espace/prix excellent'],faibles:['DSG7 à sec','Image de marque moins forte en France'],conseil:'Très bon choix rationnel.'}],
 ['seat arona',{r:3,f:4,forts:['1.0 TSI fiable','Prix bas'],faibles:['Version TGI (gaz naturel) : stations GNV rares en France, revente difficile'],conseil:'Fuir la version TGI pour revendre en France.'}],
 ['mg zs',{r:2,f:3,forts:['Garantie constructeur 7 ans','Très équipé pour le prix'],faibles:['Décote très forte','Réseau et image encore faibles'],conseil:'Achat d’usage, pas de plus-value à attendre.'}],
 ['mg hs',{r:2,f:3,forts:['Garantie 7 ans','Spacieux'],faibles:['Décote forte','Consommation élevée'],conseil:'Achat d’usage.'}],
 ['hyundai bayon',{r:3,f:4,forts:['Garantie 5 ans','Fiabilité Hyundai'],faibles:['Moins demandé que Kona','Petit SUV'],conseil:'Vérifier que la garantie constructeur court encore.'}],
 ['hyundai nexo',{r:1,f:3,forts:['Technologie hydrogène, très équipé'],faibles:['Quasi aucune station hydrogène en France','Revente très difficile'],conseil:'À éviter : la décote reflète un vrai problème d’usage.'}],
 ['hyundai tucson',{r:4,f:4,forts:['Garantie 5 ans','Hybride sobre, très demandé'],faibles:['Prix d’entrée plus élevé'],conseil:'Excellente valeur de revente.'}],
 ['kia sportage',{r:4,f:4,forts:['Garantie 7 ans transférable','Très demandé'],faibles:['Prix élevé en occasion récente'],conseil:'La garantie restante est un argument fort de revente.'}],
 ['kia stonic',{r:3,f:4,forts:['Garantie 7 ans','Simple et fiable'],faibles:['Petit coffre'],conseil:'Bon achat d’usage.'}],
 ['kia niro',{r:4,f:4,forts:['Hybride très fiable','Garantie 7 ans'],faibles:['Version électrique : batterie à vérifier'],conseil:'Demander le SoH batterie si électrique.'}],
 ['toyota',{r:5,f:5,forts:['Hybride Toyota : fiabilité de référence','Revente parmi les meilleures du marché'],faibles:['Rarement sous la cote','Prix d’achat élevé'],conseil:'Une vraie décote sur une Toyota est rare : vérifier deux fois.'}],
 ['renault captur',{r:3,f:3,forts:['Très diffusé, facile à revendre','E-Tech hybride sobre'],faibles:['1.0 TCe un peu juste','Électronique parfois capricieuse'],conseil:'Bon volume de marché.'}],
 ['renault arkana',{r:3,f:3,forts:['Look coupé','E-Tech sobre'],faibles:['Visibilité arrière','Décote moyenne'],conseil:'Acceptable sous la cote.'}],
 ['renault austral',{r:3,f:3,forts:['Récent et bien équipé','Hybride E-Tech 200'],faibles:['Jeunesse du modèle','Décote rapide la 1re année'],conseil:'Intéressant après la grosse chute.'}],
 ['ford ecosport',{r:2,f:2,forts:['Prix bas'],faibles:['1.0 EcoBoost : courroie humide fragile','Modèle arrêté, vieillissant'],conseil:'À éviter sauf prix très bas.'}],
 ['ford puma',{r:3,f:3,forts:['Agréable à conduire','Coffre astucieux (MegaBox)'],faibles:['1.0 EcoBoost : courroie humide'],conseil:'Vérifier les factures de courroie.'}],
 ['ford kuga',{r:3,f:3,forts:['Hybride rechargeable sobre'],faibles:['Rappels batterie sur PHEV','1.5 EcoBoost'],conseil:'Vérifier les rappels effectués.'}],
 ['nissan juke',{r:3,f:3,forts:['Design','1.0 DIG-T correct'],faibles:['Coffre et places arrière','Décote moyenne'],conseil:'Achat d’usage correct.'}],
 ['nissan qashqai',{r:4,f:3,forts:['Très demandé','Mild-hybrid sobre'],faibles:['Boîte CVT à surveiller'],conseil:'Bonne liquidité.'}],
 ['suzuki',{r:4,f:5,forts:['Fiabilité japonaise','Hybride léger sobre'],faibles:['Petits gabarits','Finition simple'],conseil:'Faible risque mécanique.'}],
 ['jeep',{r:2,f:2,forts:['Image de marque'],faibles:['Fiabilité moyenne','Décote forte (sauf Wrangler)'],conseil:'Seulement très sous la cote.'}],
 ['fiat',{r:2,f:3,forts:['Prix bas'],faibles:['Décote forte'],conseil:'Achat d’usage.'}],
 ['mazda',{r:4,f:5,forts:['Moteurs atmosphériques très fiables','Finition soignée'],faibles:['Peu de puissance en Skyactiv-G'],conseil:'Pari fiabilité solide.'}],
 ['audi q2',{r:4,f:4,forts:['Image premium','Base VW fiable'],faibles:['Options chères','Coffre moyen'],conseil:'Bonne revente si bien optionné.'}],
 ['porsche',{r:5,f:4,forts:['Revente premium'],faibles:['Une Porsche récente à moins de 2 000 € n’existe pas : c’est une mensualité ou un appât'],conseil:'Ignorer ces annonces.'}],
];
const ENGINES=[
 [/puretech/i,'Moteur 1.2 PureTech : courroie de distribution « humide » fragile. Stellantis a étendu sa garantie sur ce point : vérifier l’éligibilité et les factures.'],
 [/ecoboost/i,'Moteur 1.0 EcoBoost : courroie humide, risque de casse si mal entretenue.'],
 [/tgi/i,'Version gaz naturel (TGI) : stations GNV rares en France, revente compliquée.'],
 [/dsg/i,'Boîte DSG : exiger les factures de vidange, embrayage à sec parfois fragile.'],
 [/tsi/i,'Moteur TSI : bonne réputation de fiabilité.'],
 [/tce/i,'Moteur TCe (Renault/Dacia) : globalement fiable.'],
 [/hybrid|e-tech/i,'Hybride : vérifier l’état de la batterie et la garantie restante.'],
 [/[ée]lectrique|kwh|\bev\b/i,'Électrique : demander le certificat d’état de batterie (SoH).'],
];
function ficheFor(titre){
  const t=(titre||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  let best=null,len=0;for(const [k,v] of FICHES){if(t.includes(k)&&k.length>len){best=v;len=k.length;}}
  const eng=ENGINES.filter(([re])=>re.test(titre||'')).map(e=>e[1]);
  return {f:best,eng};
}
// Adaptation à la famille (2 adultes + 3 enfants, dont un de 4 ans en siège auto).
// 3 = idéal (7 places ou 3 vraies places arrière + grand coffre), 2 = correct, 1 = juste à 5, 0 = trop petite.
const FAMILLE=[
 ['peugeot 5008',3,'7 places, 3 sièges arrière individuels'],['skoda kodiaq',3,'7 places possibles, très grand coffre'],['dacia jogger',3,'7 places au meilleur prix'],
 ['kia sorento',3,'7 places, très spacieux'],['hyundai santa fe',3,'7 places, très spacieux'],['nissan x-trail',3,'7 places possibles'],['mitsubishi outlander',3,'7 places possibles'],
 ['seat tarraco',3,'7 places possibles'],['volkswagen tiguan allspace',3,'7 places possibles'],['citroen c5 aircross',3,'3 sièges arrière individuels de même largeur'],
 ['renault espace',3,'7 places possibles'],['citroen berlingo',3,'Ludospace : 3 vraies places arrière, portes coulissantes'],['peugeot rifter',3,'Ludospace : 3 vraies places arrière, portes coulissantes'],
 ['renault kangoo',3,'Ludospace : portes coulissantes, très pratique'],['volkswagen touran',3,'Monospace 7 places'],['spacetourer',3,'Monospace 7 places'],['grand c4',3,'Monospace 7 places'],
 ['ford s-max',3,'Monospace 7 places'],['ford galaxy',3,'Monospace 7 places'],['opel zafira',3,'Monospace 7 places'],['toyota proace city',3,'Ludospace spacieux'],
 ['peugeot 3008',2,'SUV familial 5 places, bon coffre'],['kia sportage',2,'SUV familial, banquette large'],['hyundai tucson',2,'SUV familial, banquette large'],['toyota rav4',2,'SUV familial, grand coffre'],
 ['renault austral',2,'SUV familial 5 places'],['volkswagen tiguan',2,'SUV familial 5 places'],['skoda karoq',2,'SUV familial, sièges arrière modulables'],['ford kuga',2,'SUV familial 5 places'],
 ['nissan qashqai',2,'SUV familial 5 places'],['seat ateca',2,'SUV familial 5 places'],['opel grandland',2,'SUV familial 5 places'],['mazda cx-5',2,'SUV familial 5 places'],
 ['bmw x1',2,'SUV familial premium'],['audi q3',2,'SUV familial premium'],['dacia duster',2,'Coffre généreux, banquette un peu étroite à 3'],['mg hs',2,'SUV familial 5 places'],
 ['skoda octavia',2,'Grand coffre, banquette large'],['skoda superb',2,'Très grande banquette arrière'],['peugeot 308 sw',2,'Break familial'],['toyota corolla touring',2,'Break familial'],
 ['jeep compass',2,'SUV compact 5 places'],['renault arkana',1,'Garde au toit réduite à l’arrière'],
 ['peugeot 2008',1,'Juste pour 3 enfants dont un en siège auto'],['citroen c3 aircross',1,'Juste à 5'],['opel crossland',1,'Juste à 5'],['opel mokka',1,'Petit coffre, juste à 5'],
 ['volkswagen t-roc',1,'Juste à 5'],['volkswagen t-cross',1,'Juste à 5'],['volkswagen taigo',1,'Juste à 5'],['skoda kamiq',1,'Juste à 5'],['seat arona',1,'Juste à 5'],
 ['mg zs',1,'Juste à 5'],['hyundai kona',1,'Juste à 5'],['hyundai bayon',1,'Juste à 5'],['nissan juke',1,'Places arrière étroites'],['jeep avenger',1,'Petit SUV'],
 ['renault captur',1,'Juste à 5'],['ford puma',1,'Juste à 5'],['ford ecosport',1,'Juste à 5'],['kia stonic',1,'Juste à 5'],['kia niro',1,'Juste à 5'],['toyota c-hr',1,'Places arrière étroites'],
 ['toyota yaris cross',1,'Petit SUV'],['audi q2',1,'Petit SUV'],['fiat 600',1,'Petit SUV'],['fiat 500x',1,'Petit SUV'],['jeep renegade',1,'Petit SUV'],['mazda cx-30',1,'Places arrière étroites'],
 ['dacia sandero',0,'Citadine, trop petite pour 5'],['dacia spring',0,'4 places seulement'],['citroen c3',0,'Citadine'],['peugeot 208',0,'Citadine'],['renault clio',0,'Citadine'],
 ['fiat 500',0,'Citadine'],['fiat panda',0,'Citadine'],['suzuki ignis',0,'Citadine'],['bmw serie 1',0,'Compacte, banquette étroite'],['volkswagen polo',0,'Citadine'],
];
function familleFor(titre,places){
  const t=(titre||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  let best=null,len=0;for(const [k,s,n] of FAMILLE){if(t.includes(k)&&k.length>len){best={s,n};len=k.length;}}
  if((+places||0)>=7||/\b7 ?(places|pl\b|sitze|sitzer|seats)|7-sitze|7p\b/i.test(titre||''))best={s:3,n:'7 places'};
  if(/\bvan\b|utilitaire|fourgon|\b1000 ?kg\b|\b[23] places/i.test(titre||''))best={s:0,n:'Utilitaire, pas de vraie banquette arrière'};
  return best||{s:null,n:''};
}
function familleBadge(fm){
  if(fm.s===3)return '<span class="badge b-up">Idéal famille</span>';
  if(fm.s===2)return '<span class="badge b-acc">Famille OK</span>';
  if(fm.s===1)return '<span class="badge b-warn">Juste à 5</span>';
  if(fm.s===0)return '<span class="badge b-down">Trop petite</span>';
  return '';
}
function dots(n){return '<span class="dots" aria-label="'+n+' sur 5">'+[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')+'</span>';}
function ficheHTML(titre,open){
  const {f,eng}=ficheFor(titre);
  if(!f&&!eng.length) return '';
  return `<details class="fiche"${open?' open':''}><summary><span>Fiche modèle</span>${f?`<span class="scores"><span>Revente ${dots(f.r)}</span><span>Fiabilité ${dots(f.f)}</span></span>`:''}</summary>
   <div class="fiche-body">
   ${f?`<div class="fl"><b class="plus">Points forts</b><ul>${f.forts.map(x=>`<li>${x}</li>`).join('')}</ul></div>
   <div class="fl"><b class="minus">Points faibles</b><ul>${f.faibles.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
   ${eng.length?`<div class="eng">${eng.map(x=>`<p>⚙ ${x}</p>`).join('')}</div>`:''}
   ${(()=>{const fm=familleFor(titre);return fm.s!==null?`<p class="tip">Famille de 5 : ${['trop petite','juste','correcte','idéale'][fm.s]} — ${fm.n}</p>`:''})()}
   ${f&&f.conseil?`<p class="tip">${f.conseil}</p>`:''}
   </div></details>`;
}
