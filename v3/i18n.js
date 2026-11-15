// @ts-check
/* UI strings in English and French. Research details stay in English; summaries are translated. */
import { store } from "./util.js";

const K_LANG = "dkr3-lang";
/** @type {"en"|"fr"} */
export let lang = store.get(K_LANG, (navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en") === "fr" ? "fr" : "en";
/** @param {"en"|"fr"} l */
export function setLang(l) { lang = l; store.set(K_LANG, l); document.documentElement.lang = l; }

/** @type {Record<string, [string, string]>} */
const S = {
  appName: ["Dakar season 2026", "Dakar saison 2026"],
  tabToday: ["Today", "Aujourd'hui"], tabExplore: ["Explore", "Explorer"], tabMap: ["Map", "Carte"],
  tabPlan: ["Plan", "Planning"], tabPicks: ["Picks", "Favoris"],
  audAll: ["All", "Tout"], audFamily: ["Family", "Famille"], audCouple: ["The two of us", "À deux"], audSolo: ["On my own", "Seul(e)"],
  audLabel: ["Who is this for", "Pour qui"],
  forFamily: ["family", "famille"], forCouple: ["the two of you", "à deux"], forSolo: ["one adult", "un adulte"],
  langBtn: ["FR", "EN"], langAria: ["Passer en français", "Switch to English"],
  // Today
  tonight: ["Tonight", "Ce soir"], daytime: ["On today", "Aujourd'hui"], runningNow: ["Running now", "En ce moment"],
  withGirls: ["With the girls", "Avec les filles"], twoOfYou: ["The two of you", "Rien que vous deux"], oneAdult: ["One adult", "Un adulte seul"],
  twoOfYouLater: ["The two of you, from Dec 4", "À deux, à partir du 4 déc."],
  twoOfYouLaterNote: ["Ideas for when both adults are in town. Star them now, plan them later.", "Des idées pour quand vous serez tous les deux. Ajoutez-les aux favoris, planifiez plus tard."],
  wifeStretch: ["Evenings while the grandparents mind the girls", "Les soirées pendant que les grands-parents gardent les filles"],
  bizBlock: ["Work block, Dec 10 to 19", "Bloc travail, du 10 au 19 déc."],
  clashNight: ["Clash night", "Soirée chargée"], seeDay: ["See the whole day", "Voir toute la journée"],
  nothingTonight: ["Nothing dated tonight. Try the ideas below.", "Rien de daté ce soir. Voici des idées ci-dessous."],
  sunset: ["Sunset", "Coucher du soleil"], sunsetAbout: ["about", "vers"],
  dayStrip: ["Pick a day", "Choisir un jour"], todayChip: ["Today", "Aujourd'hui"],
  beforeTrip: ["The trip starts Sat Nov 14. Showing the first day.", "Le séjour commence le sam. 14 nov. Premier jour affiché."],
  afterTrip: ["The trip ended Sat Jan 2. Showing the last day.", "Le séjour s'est terminé le sam. 2 janv. Dernier jour affiché."],
  // Weather
  weatherLoading: ["Checking the forecast…", "Prévisions en cours…"],
  weatherNone: ["Forecast shows up 2 weeks ahead.", "Les prévisions s'affichent 2 semaines avant."],
  weatherOff: ["Forecast unavailable offline.", "Prévisions indisponibles hors ligne."],
  uvHigh: ["UV {uv}: shade from 11:00 to 16:00, hats on", "UV {uv} : à l'ombre de 11:00 à 16:00, chapeaux"],
  windy: ["Windy ({w} km/h): boat crossings may be choppy", "Venteux ({w} km/h) : traversées en bateau agitées"],
  rain: ["Rain chance {p}%", "Risque de pluie {p} %"],
  wClear: ["Sunny", "Ensoleillé"], wMostly: ["Mostly sunny", "Plutôt ensoleillé"], wCloudy: ["Cloudy", "Nuageux"],
  wFog: ["Hazy", "Brumeux"], wDrizzle: ["Drizzle", "Bruine"], wRain: ["Rain", "Pluie"], wShowers: ["Showers", "Averses"], wStorm: ["Storms", "Orages"],
  forecastSrc: ["Forecast: Open-Meteo", "Prévisions : Open-Meteo"],
  // Explore
  search: ["Search places, food, music, beaches…", "Chercher un lieu, un resto, une plage…"],
  allSections: ["Everything", "Tout"], events: ["Dated events", "Événements datés"],
  qTod: ["Toddler-friendly", "Adapté aux petits"], qU30: ["Under 30 min", "Moins de 30 min"], qU60: ["Under 1 h", "Moins d'1 h"],
  qFree: ["Free", "Gratuit"], qBook: ["Book or confirm", "À réserver ou confirmer"], qPhoto: ["With photo", "Avec photo"],
  results: ["{n} results", "{n} résultats"], oneResult: ["1 result", "1 résultat"], noResults: ["Nothing matches. Clear a filter or search less.", "Aucun résultat. Retirez un filtre ou simplifiez la recherche."],
  clear: ["Clear", "Effacer"], showMore: ["Show more", "Voir plus"],
  driveEst: ["≈{m} by car", "≈{m} en voiture"], fromBase: ["from home base, estimate", "depuis la maison, estimation"],
  // Cards and sheet
  star: ["Save to picks", "Ajouter aux favoris"], unstar: ["Remove from picks", "Retirer des favoris"],
  open: ["Open", "Ouvrir"], close: ["Close", "Fermer"], addDay: ["Add to a day", "Ajouter à un jour"],
  maps: ["Open in Maps", "Ouvrir dans Maps"], whatsapp: ["Share on WhatsApp", "Partager sur WhatsApp"],
  gcal: ["Google Calendar", "Google Agenda"], details: ["Details", "Détails"], detailsEn: ["Details in English", "Détails en anglais"],
  sources: ["Sources", "Sources"], status: ["Status", "Statut"], area: ["Area", "Quartier"],
  photoBy: ["Photo", "Photo"], at: ["At", "Lieu"], when: ["When", "Quand"], time: ["Time", "Heure"], price: ["Price", "Prix"],
  linkedPlace: ["About the venue", "À propos du lieu"], pickDay: ["Pick a day", "Choisir un jour"],
  addedTo: ["Added to {d}", "Ajouté au {d}"], undo: ["Undo", "Annuler"], removed: ["Removed", "Retiré"],
  topPick: ["Top pick {n}", "Coup de cœur {n}"], dateNight: ["Date night {n}", "Soirée à deux {n}"],
  approxPin: ["Map pins are by neighbourhood, approximate.", "Les points sur la carte sont approximatifs, par quartier."],
  notPlaced: ["Not on the map: no single neighbourhood or town.", "Pas sur la carte : pas de quartier ou de ville précis."],
  showOnMap: ["Show on map", "Voir sur la carte"],
  fitGreat: ["Great with toddlers", "Idéal avec des petits"], fitFine: ["Fine with planning", "Bien, avec un peu d'organisation"],
  fitSkip: ["Skip or hard", "À éviter ou difficile"], fitUnrated: ["Not rated", "Non évalué"],
  catFamily: ["Family-friendly", "En famille"], catArts: ["Arts and culture", "Arts et culture"], catMusic: ["Music and nightlife", "Musique et sorties"],
  catRomantic: ["Romantic", "Romantique"], catSports: ["Sports", "Sport"], catAi: ["AI and tech", "IA et tech"], catBiz: ["Investors and business", "Investisseurs et affaires"],
  // Map
  vCity: ["City", "Ville"], vGreater: ["Greater Dakar", "Grand Dakar"], vCoast: ["Coast", "Côte"], vSen: ["Senegal", "Sénégal"],
  zoomIn: ["Zoom in", "Zoomer"], zoomOut: ["Zoom out", "Dézoomer"], homeBase: ["Home base", "Maison"],
  tapPin: ["Tap a number to see the places there.", "Touchez un chiffre pour voir les lieux."],
  placesHere: ["{n} places here", "{n} lieux ici"],
  // Picks and sharing
  yourPicks: ["Your picks", "Vos favoris"], picksEmpty: ["Nothing saved yet. Tap the star on anything, or swipe through a deck below.", "Rien pour l'instant. Touchez l'étoile, ou faites défiler un jeu de cartes ci-dessous."],
  pickTogether: ["Pick together", "Choisir ensemble"],
  pickTogetherNote: ["Each of you swipes on your own phone. Right saves it, left skips it. Then send your picks to each other and see what you both liked.", "Chacun fait défiler sur son téléphone. À droite on garde, à gauche on passe. Envoyez-vous vos favoris pour voir ce qui vous plaît à tous les deux."],
  deckDate: ["Date nights", "Soirées à deux"], deckFamily: ["Family outings", "Sorties en famille"], deckEscape: ["Weekend escapes", "Escapades du week-end"],
  left: ["{n} left", "{n} restants"], deckDone: ["Deck done. Send your picks so you can compare.", "Terminé. Envoyez vos favoris pour comparer."],
  skip: ["Skip", "Passer"], keep: ["Save", "Garder"], back: ["Back", "Retour"], restart: ["Start over", "Recommencer"],
  thisPhone: ["Name on this phone", "Nom sur ce téléphone"], thisPhoneNote: ["Shown to the other person when you share. Stays on this phone.", "Affiché à l'autre personne quand vous partagez. Reste sur ce téléphone."],
  me: ["Me", "Moi"],
  sendPicks: ["Send my picks on WhatsApp", "Envoyer mes favoris sur WhatsApp"], copyLink: ["Copy link", "Copier le lien"], copied: ["Link copied", "Lien copié"],
  shareMsg: ["My Dakar picks: open to compare with yours", "Mes favoris Dakar : ouvre pour comparer avec les tiens"],
  bothLike: ["You both like", "Vous aimez tous les deux"], onlyThem: ["Only {who}", "Seulement {who}"], onlyMe: ["Only you", "Seulement vous"],
  addAll: ["Add all to mine", "Tout ajouter aux miens"], forget: ["Forget their picks", "Oublier leurs favoris"],
  sharedTitle: ["{who} sent their picks", "{who} vous a envoyé ses favoris"],
  sharedBody: ["{s} saved places and {p} planned days. Keep them on this phone to compare? Nothing is uploaded.", "{s} favoris et {p} jours planifiés. Les garder sur ce téléphone pour comparer ? Rien n'est envoyé en ligne."],
  keepThem: ["Keep to compare", "Garder pour comparer"], notNow: ["Not now", "Pas maintenant"],
  shareBad: ["That share link is damaged or from another version.", "Ce lien de partage est abîmé ou d'une autre version."],
  likedBy: ["{who} likes this", "{who} aime"],
  // Plan
  planTitle: ["Your plan", "Votre planning"], planNote: ["Add things to days from any card. Times are estimates; add 50 to 100% at rush hour.", "Ajoutez des sorties aux jours depuis n'importe quelle carte. Les temps sont estimés ; ajoutez 50 à 100 % aux heures de pointe."],
  exportIcs: ["Add plan to my calendar (.ics)", "Ajouter à mon agenda (.ics)"], nothingPlanned: ["Nothing planned", "Rien de prévu"],
  eventsThisDay: ["{n} dated events this day", "{n} événements ce jour-là"], eventsThisDay1: ["1 dated event this day", "1 événement ce jour-là"], addFromPicks: ["Add from picks", "Ajouter depuis les favoris"],
  moveUp: ["Move up", "Monter"], moveDown: ["Move down", "Descendre"], remove: ["Remove", "Retirer"],
  between: ["≈{m} between", "≈{m} de trajet"], showEarlier: ["Show earlier days", "Voir les jours passés"],
  theirPlan: ["{who}'s plan", "Planning de {who}"], copyTheirs: ["Copy to my plan", "Copier dans mon planning"],
  icsEmpty: ["Your plan is empty.", "Votre planning est vide."], icsDone: ["Calendar file downloaded", "Fichier d'agenda téléchargé"],
  fullGuide: ["Full text guide", "Guide complet (texte)"], fullGuideNote: ["Health, booking checklist, contacts and every source.", "Santé, liste de réservations, contacts et toutes les sources."],
  offlineReady: ["Saved for offline use", "Disponible hors ligne"],
  installHint: ["Tip: Share, then Add to Home Screen, to open it like an app.", "Astuce : Partager, puis Sur l'écran d'accueil, pour l'ouvrir comme une appli."],
  weekdayNames: ["", ""],
};

/** @param {string} key @param {Record<string, string|number>} [vars] */
export function t(key, vars) {
  const pair = S[key];
  let s = pair ? pair[lang === "fr" ? 1 : 0] : key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

/** French section titles; English comes from the data. @type {Record<string, string>} */
const SEC_FR = {
  restaurants: "Restaurants", family: "Cafés, brunchs et piscines", kids: "Enfants", sights: "Îles, plages et visites",
  resorts: "Hôtels-clubs près de Dakar", getaways: "Escapades", music: "Musique et sorties", romantic: "Soirées romantiques",
  weekends: "Week-ends à deux", arts: "Arts et culture", ai: "IA et tech", sports: "Sport et plein air",
};
/** @param {{key:string, short:string}} s */
export const secLabel = s => (lang === "fr" ? SEC_FR[s.key] || s.short : s.short);

/** French labels for the most common research field names. @type {Record<string, string>} */
const FIELD_FR = {
  "What it is": "De quoi il s'agit", Price: "Prix", Contact: "Contact", "Toddler notes": "Avec des petits", Hours: "Horaires",
  When: "Quand", "How to book or contact": "Réserver ou contacter", Suits: "Pour qui", Event: "Événement", Where: "Où",
  Cost: "Coût", "Fit for these ages": "Pour ces âges", Details: "Détails", Adult: "Adulte", Child: "Enfant", "Under-4": "Moins de 4 ans",
  "Children's programme": "Programme enfants", Showing: "À l'affiche", Includes: "Comprend", "Watch-outs": "Points d'attention",
  "Getting there (sourced)": "Y aller (sourcé)", "Verdict for these ages": "Verdict pour ces âges", "Best toddler base": "Meilleure base avec des petits",
};
/** @param {string} k */
export const fieldLabel = k => (lang === "fr" ? FIELD_FR[k] || k : k);
