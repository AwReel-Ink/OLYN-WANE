// ============================================================
//  CONFIG.JS — Fichier de configuration central du Hub
//  Pour ajouter une application : ajouter un objet dans APPS
//  Pour ajouter une catégorie  : ajouter dans CATEGORIES
// ============================================================

const HUB_CONFIG = {
  name: "OLYN-WANE",
  subtitle: "Accès rapide à vos applications",
  maxTabs: 5,
  version: "1.0.0"
};

// --- CATÉGORIES -------------------------------------------
// id        : identifiant unique (sans espace, sans accent)
// label     : nom affiché
// icon      : emoji ou caractère
// color     : couleur de l'étiquette
// ----------------------------------------------------------
const CATEGORIES = [
  { id: "general",         label: "Général",          icon: "🌐", color: "#6c757d" },
  { id: "espaces-verts",   label: "Espaces Verts",    icon: "🌿", color: "#2d6a4f" },
  { id: "sous-traitance",  label: "Sous-traitance",   icon: "🔧", color: "#e76f51" },
  { id: "logistique",      label: "Logistique",       icon: "📦", color: "#457b9d" },
  { id: "cuisine",         label: "Cuisine",          icon: "🍽️", color: "#e9c46a" },
  { id: "mhl",             label: "MHL",              icon: "🏭", color: "#9b5de5" },
  { id: "parfumerie",      label: "Parfumerie",       icon: "🌸", color: "#f72585" },
  { id: "multi-service",   label: "Multi-service",    icon: "⚙️", color: "#4cc9f0" },
  { id: "administratif",   label: "Administratif",    icon: "📋", color: "#f4a261" }
];

// --- APPLICATIONS -----------------------------------------
// id          : identifiant unique
// name        : nom affiché sur la carte et l'onglet
// url         : URL GitHub Pages de l'application
// icon        : emoji représentatif
// color       : couleur accent de la carte
// categories  : tableau d'ids de catégories (voir ci-dessus)
// description : texte court affiché sous le nom
// ----------------------------------------------------------
const APPS = [
  {
    id: "hetra",
    name: "HeTra (Heures Travaillées)",
    url: "https://awreel-ink.github.io/LAPPHetra/",
    icon: null,
    iconFallback: "⏱️",
    color: "#2d6a4f",
    categories: ["espaces-verts", "mhl", "multi-service", "general"],
    description: "Permet de définir des heures d'arrivées et de départ sur plusieurs période, ainsi que le calcule du temps cumulé"
  },
  {
    id: "lappev3.0",
    name: "LAPP EV 3.0",
    url: "https://awreel-ink.github.io/LAPPEV3.0/",
    icon: null,
    iconFallback: "🥬",
    color: "#606c38",
    categories: ["espaces-verts"],
    description: "Gestion de zone de chantier Espaces Verts, Édition/Modification de zone de chantier et fiche client"
  },
  {
    id: "meszur",
    name: "MesZeuR",
    url: "https://awreel-ink.github.io/MesZeuR/",
    icon: null,
    iconFallback: "📊",
    color: "#457b9d",
    categories: ["general", "administratif"],
    description: "Gérez vos heures de travail simplement, par emploi/société."
  },
  {
    id: "vi-turette",
    name: "VI-Turette",
    url: "https://awreel-ink.github.io/VI-Turette/",
    icon: null,
    iconFallback: "🚗",
    color: "#e76f51",
    categories: ["general", "espaces-verts", "mhl"],
    description: "Calcule des Temps de trajet réaliste — Voiture & Voiturette Sans Permis"
  },
  {
    id: "liconote",
    name: "LiCoNote",
    url: "https://awreel-ink.github.io/Liconote/",
    icon: null,
    iconFallback: "📖",
    color: "#59c2fc",
    categories: ["general", "espaces-verts", "mhl","sous-traitance", "multi-service", "parfumerie"],
    description: "Gestion de liste client, adresse, téléphone, mail & travaux réalisés"
  },
    {
    id: "energie_pile",
    name: "Energie_Pile",
    url: "https://awreel-ink.github.io/Energie_Pile/",
    icon: null,
    iconFallback: "🔋",
    color: "#51e751",
    categories: ["general", "espaces-verts", "mhl"],
    description: "Gestion du parc de piles par appareils & par secteur"
  },
  {
    id: "dessnotes",
    name: "DessNotes",
    url: "https://awreel-ink.github.io/DessNotes/",
    icon: null,
    iconFallback: "🎨",
    color: "#71AAB7",
    categories: ["general", "espaces-verts", "multi-service"],
    description: "Editeur d'image basique pour prise de note sur image, gestion des calques, pinceau, règle, gomme, texte, prise en charge des formats heif, heic, png, jpg, webp ... "
  },
  {
    id: "mesurepro",
    name: "MesurePro",
    url: "https://awreel-ink.github.io/MesurePro/",
    icon: null,
    iconFallback: "📏",
    color: "#29930B",
    categories: ["general", "espaces-verts", "sous-traitance", "multi-service"],
    description: "Plusieurs outils de mesure qui peuvent être utile en dépannage. "
  }
];


