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
function dots(n){return '<span class="dots" aria-label="'+n+' sur 5">'+[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')+'</span>';}
function ficheHTML(titre,open){
  const {f,eng}=ficheFor(titre);
  if(!f&&!eng.length) return '';
  return `<details class="fiche"${open?' open':''}><summary><span>Fiche modèle</span>${f?`<span class="scores"><span>Revente ${dots(f.r)}</span><span>Fiabilité ${dots(f.f)}</span></span>`:''}</summary>
   <div class="fiche-body">
   ${f?`<div class="fl"><b class="plus">Points forts</b><ul>${f.forts.map(x=>`<li>${x}</li>`).join('')}</ul></div>
   <div class="fl"><b class="minus">Points faibles</b><ul>${f.faibles.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
   ${eng.length?`<div class="eng">${eng.map(x=>`<p>⚙ ${x}</p>`).join('')}</div>`:''}
   ${f&&f.conseil?`<p class="tip">${f.conseil}</p>`:''}
   </div></details>`;
}
