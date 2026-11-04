export type Product = {
  id: string;
  name: string;
  subtitle: string;
  category: "Soin Visage" | "Soin Corps" | "Compléments" | "Bien-être" | "Maquillage";
  price: number;
  volume: string;
  pp: number;
  rating: number;
  reviews: number;
  badges: string[];
  shortBenefits: string[];
  description: string;
  ingredients: { name: string; scientific: string; benefits: string[] }[];
  howToUse: string[];
  bestSeller?: boolean;
};

export const products: Product[] = [
  {
    id: "3s-capsule",
    name: "3S Capsule",
    subtitle: "Anti-âge triple cellules souches",
    category: "Soin Visage",
    price: 189,
    volume: "30 capsules",
    pp: 120,
    rating: 4.9,
    reviews: 142,
    badges: ["SwisDerm Switzerland", "Bio", "Best-Seller"],
    bestSeller: true,
    shortBenefits: [
      "Renouvellement cellulaire accéléré",
      "Éclaircissement uniforme du teint",
      "Réduction visible des rides et pores",
      "Régulation naturelle du sébum",
    ],
    description:
      "Le 3S Capsule combine la puissance régénératrice de trois cellules souches végétales — Pomme suisse, Rose alpine et Orange amère — encapsulées avec de l'huile de Jojoba pour une biodisponibilité maximale. Une routine intensive de 30 jours pour révéler un éclat nouveau.",
    ingredients: [
      { name: "Cellules souches de Pomme", scientific: "Malus Domestica", benefits: ["Longévité cellulaire", "Anti-rides profond"] },
      { name: "Rose alpine", scientific: "Rosa Alpina", benefits: ["Protection ADN", "Régénération nocturne"] },
      { name: "Orange amère", scientific: "Citrus Aurantium", benefits: ["Éclat & uniformité", "Anti-oxydant"] },
      { name: "Huile de Jojoba", scientific: "Simmondsia Chinensis", benefits: ["Vecteur de pénétration", "Équilibre hydrique"] },
    ],
    howToUse: [
      "Ouvrir une capsule le soir, sur peau propre et sèche.",
      "Appliquer en massage circulaire du centre vers l'extérieur.",
      "Laisser pénétrer 2 minutes avant d'appliquer une crème de nuit.",
      "Cure intensive : 1 capsule/soir pendant 30 jours.",
    ],
  },
  {
    id: "bio-white-cream",
    name: "Bio White Cream",
    subtitle: "Crème éclaircissante SPF 25",
    category: "Soin Visage",
    price: 145,
    volume: "50 ml",
    pp: 90,
    rating: 4.8,
    reviews: 98,
    badges: ["SwisDerm Switzerland", "SPF 25"],
    bestSeller: true,
    shortBenefits: ["Atténue les taches pigmentaires", "Protection solaire SPF 25", "Unifie le teint", "Hydratation longue durée"],
    description:
      "Crème jour fusionnant éclaircissement naturel et photoprotection. Idéale pour les peaux marquées par les taches d'âge ou post-acné.",
    ingredients: [
      { name: "Citron", scientific: "Citrus Limon", benefits: ["Éclaircissement", "Vitamine C naturelle"] },
      { name: "Colza", scientific: "Brassica Napus", benefits: ["Anti-oxydant", "Réparation"] },
      { name: "Vitamine C & E", scientific: "Ascorbic Acid + Tocopherol", benefits: ["Bouclier anti-oxydant", "Éclat"] },
      { name: "Myrtille", scientific: "Vaccinium Myrtillus", benefits: ["Micro-circulation", "Anti-tache"] },
    ],
    howToUse: ["Appliquer le matin sur peau propre.", "Étaler uniformément du visage au cou.", "Renouveler l'application après exposition prolongée."],
  },
  {
    id: "b-cream",
    name: "B Cream",
    subtitle: "Botox naturel — effet liftant 5X",
    category: "Soin Visage",
    price: 210,
    volume: "30 ml",
    pp: 150,
    rating: 5.0,
    reviews: 211,
    badges: ["SwisDerm Switzerland", "Cliniquement testé", "Best-Seller"],
    bestSeller: true,
    shortBenefits: [
      "−78 % de rides après 28 jours",
      "Pores 84 % plus fins",
      "Lifting des joues +68 %",
      "Hydratation +75 %, lissage 98 %",
    ],
    description:
      "Concentré liftant d'effet immédiat et progressif. Une alternative douce et naturelle aux injections, à intégrer dans votre routine quotidienne.",
    ingredients: [
      { name: "Peptides végétaux", scientific: "Hexapeptide-8", benefits: ["Effet relaxant musculaire", "Anti-rides"] },
      { name: "Acide hyaluronique", scientific: "Sodium Hyaluronate", benefits: ["Repulpe", "Hydratation profonde"] },
      { name: "Cellules souches alpines", scientific: "Leontopodium Alpinum", benefits: ["Lifting", "Densification"] },
    ],
    howToUse: ["Matin et soir sur peau parfaitement nettoyée.", "2 pressions du bout des doigts.", "Mouvements ascendants du menton vers les tempes."],
  },
  {
    id: "hydrating-toning-lotion",
    name: "Hydrating Toning Lotion",
    subtitle: "Lotion tonique hydratante",
    category: "Soin Visage",
    price: 95,
    volume: "200 ml",
    pp: 70,
    rating: 4.7,
    reviews: 76,
    badges: ["Sans parabène", "Sans alcool"],
    shortBenefits: ["Resserre les pores", "Élimine impuretés", "Prépare la peau aux soins", "Action anti-pigmentation"],
    description: "Tonique haute tolérance, parfait équilibre entre purification et hydratation. Convient à toutes les peaux, même sensibles.",
    ingredients: [
      { name: "Eau florale de Rose", scientific: "Rosa Damascena", benefits: ["Apaisement", "Tonification"] },
      { name: "Acide salicylique doux", scientific: "Salicylic Acid", benefits: ["Anti-imperfections", "Pores"] },
    ],
    howToUse: ["Imbiber un coton.", "Tamponner sur le visage matin et soir.", "Suivre avec sérum et crème."],
  },
  {
    id: "s-fem-serum",
    name: "S Fem Serum",
    subtitle: "Nano-spray fermeté & anti-cellulite",
    category: "Soin Corps",
    price: 165,
    volume: "150 ml",
    pp: 110,
    rating: 4.8,
    reviews: 64,
    badges: ["SwisDerm Switzerland", "Nano-technologie"],
    shortBenefits: ["Action anti-cellulite ciblée", "Raffermit bras, cuisses, ventre", "Texture nano-spray", "Pénétration immédiate"],
    description: "Sérum corporel en nano-spray pour une absorption ultra-rapide, dédié aux zones à raffermir.",
    ingredients: [
      { name: "Guarana", scientific: "Paullinia Cupana", benefits: ["Lipolyse", "Action minceur"] },
      { name: "Lierre", scientific: "Hedera Helix", benefits: ["Drainage", "Anti-cellulite"] },
      { name: "Tournesol & Colza", scientific: "Helianthus + Brassica", benefits: ["Nutrition", "Élasticité"] },
    ],
    howToUse: ["Vaporiser sur les zones ciblées matin et soir.", "Masser 2 minutes par mouvements circulaires.", "Cure de 8 semaines pour résultats optimaux."],
  },
  {
    id: "s-hydro",
    name: "S Hydro",
    subtitle: "Générateur d'eau hydrogénée H₂",
    category: "Bien-être",
    price: 450,
    volume: "Bouteille rechargeable",
    pp: 300,
    rating: 4.9,
    reviews: 53,
    badges: ["SwisDerm Switzerland", "Innovation"],
    bestSeller: true,
    shortBenefits: ["Antioxydant puissant", "Action anti-inflammatoire", "Soutien cardiovasculaire", "Boost métabolique"],
    description:
      "Bouteille innovante produisant de l'eau enrichie en hydrogène moléculaire. Un geste quotidien aux bénéfices scientifiquement documentés.",
    ingredients: [{ name: "Hydrogène moléculaire", scientific: "H₂", benefits: ["Neutralise radicaux libres", "Neuroprotection"] }],
    howToUse: ["Remplir d'eau filtrée.", "Activer le cycle d'électrolyse (3 minutes).", "Consommer immédiatement pour bénéfices maximums."],
  },
  {
    id: "s-xtra-caffe",
    name: "S Xtra Caffe",
    subtitle: "Café focus & énergie premium",
    category: "Compléments",
    price: 85,
    volume: "12 sachets",
    pp: 60,
    rating: 4.6,
    reviews: 41,
    badges: ["Sans sucre", "Naturel"],
    shortBenefits: ["Focus mental durable", "Énergie sans crash", "Adaptogènes ciblés", "Goût premium"],
    description: "Mélange Arabica/Robusta enrichi en Tongkat Ali et Galangal pour une stimulation cognitive nette.",
    ingredients: [
      { name: "Tongkat Ali", scientific: "Eurycoma Longifolia", benefits: ["Énergie", "Équilibre hormonal"] },
      { name: "enXtra (Galangal)", scientific: "Alpinia Galanga", benefits: ["Focus", "Vigilance"] },
    ],
    howToUse: ["Diluer 1 sachet dans 200 ml d'eau chaude.", "Consommer le matin ou en début d'après-midi."],
  },
  {
    id: "s-factor",
    name: "S-Factor",
    subtitle: "Poudre anti-âge 4-en-1",
    category: "Compléments",
    price: 195,
    volume: "20 sachets",
    pp: 130,
    rating: 4.8,
    reviews: 87,
    badges: ["SwisDerm Switzerland", "Bio"],
    shortBenefits: ["Anti-âge global", "Collagène marin", "Anti-oxydants premium", "Énergie cellulaire"],
    description: "Cocktail nutritionnel haut de gamme : superfruits, cellules souches végétales et collagène poisson pour un anti-âge de l'intérieur.",
    ingredients: [
      { name: "Açaï & Mangoustan", scientific: "Euterpe + Garcinia", benefits: ["Anti-oxydant", "Détox"] },
      { name: "Collagène marin", scientific: "Marine Collagen", benefits: ["Peau & articulations"] },
      { name: "Curcuma blanc", scientific: "Curcuma Zedoaria", benefits: ["Anti-inflammatoire"] },
    ],
    howToUse: ["Diluer 1 sachet dans un verre d'eau froide.", "Consommer le matin à jeun.", "Cure de 20 jours, renouvelable."],
  },
  {
    id: "sun-protector",
    name: "Sun Protector",
    subtitle: "Crème solaire teintée SPF 30",
    category: "Soin Visage",
    price: 110,
    volume: "50 ml",
    pp: 75,
    rating: 4.7,
    reviews: 62,
    badges: ["SPF 30", "Teinté"],
    shortBenefits: ["Protection UVA/UVB", "Teinte unifiante", "Texture légère", "Anti-tache préventif"],
    description: "Protection solaire haute, fini soyeux et teinte naturelle pour un usage quotidien.",
    ingredients: [
      { name: "Arbutine", scientific: "Arbutin", benefits: ["Anti-tache", "Éclat"] },
      { name: "Argan", scientific: "Argania Spinosa", benefits: ["Nutrition", "Anti-âge"] },
    ],
    howToUse: ["Appliquer 20 minutes avant exposition.", "Renouveler toutes les 2 heures."],
  },
  {
    id: "gentle-cleansing-cream",
    name: "Gentle Cleansing Cream",
    subtitle: "Nettoyant doux quotidien",
    category: "Soin Visage",
    price: 85,
    volume: "100 ml",
    pp: 55,
    rating: 4.6,
    reviews: 49,
    badges: ["Sans sulfate", "Hypoallergénique"],
    shortBenefits: ["Nettoie sans agresser", "Apaise les rougeurs", "Préserve le film hydrolipidique", "Convient peaux sensibles"],
    description: "Crème nettoyante douce enrichie de plantes apaisantes pour une peau nette et confortable.",
    ingredients: [
      { name: "Camomille", scientific: "Matricaria Chamomilla", benefits: ["Apaisant"] },
      { name: "Thé vert", scientific: "Camellia Sinensis", benefits: ["Anti-oxydant"] },
      { name: "Aloe vera", scientific: "Aloe Barbadensis", benefits: ["Hydratation"] },
    ],
    howToUse: ["Appliquer sur peau humide.", "Masser doucement.", "Rincer abondamment."],
  },
  {
    id: "revitalizing-foundation",
    name: "Revitalizing Foundation",
    subtitle: "Fond de teint soin SPF 30",
    category: "Maquillage",
    price: 125,
    volume: "30 ml",
    pp: 85,
    rating: 4.7,
    reviews: 71,
    badges: ["SPF 30", "Soin & Maquillage"],
    shortBenefits: ["Couvrance modulable", "Effet bonne mine immédiat", "Soin anti-âge intégré", "Protection SPF 30"],
    description: "Plus qu'un fond de teint : un soin couvrant nourrissant qui sublime et protège la peau.",
    ingredients: [
      { name: "Jojoba", scientific: "Simmondsia Chinensis", benefits: ["Équilibre", "Confort"] },
      { name: "Amande douce", scientific: "Prunus Dulcis", benefits: ["Nutrition"] },
      { name: "Vitamine E", scientific: "Tocopherol", benefits: ["Anti-âge"] },
    ],
    howToUse: ["Appliquer du centre vers l'extérieur.", "Estomper au pinceau ou éponge humide."],
  },
];

export type Pack = {
  id: string;
  name: string;
  pp: number;
  price: number;
  highlight?: string;
  popular?: boolean;
  premium?: boolean;
  benefits: string[];
};

export const packs: Pack[] = [
  {
    id: "bronze",
    name: "Bronze",
    pp: 60,
    price: 750,
    benefits: ["Accès catalogue networker", "Prix préférentiels −15 %", "Carte de membre digitale", "Onboarding express"],
  },
  {
    id: "business",
    name: "Business",
    pp: 120,
    price: 1500,
    benefits: ["Tous les avantages Bronze", "Formation démarrage complète", "Coach dédié 30 jours", "Kit de présentation"],
  },
  {
    id: "silver",
    name: "Silver",
    pp: 180,
    price: 2000,
    benefits: ["Tous les avantages Business", "Formation avancée vente", "Kit marketing digital", "Accès aux masterclass mensuelles"],
  },
  {
    id: "gold",
    name: "Gold",
    pp: 420,
    price: 5000,
    popular: true,
    highlight: "Le plus populaire",
    benefits: ["Rang Gold immédiat", "Commissions élevées", "Événements VIP exclusifs", "Mentor senior personnel", "Voyage incentive annuel"],
  },
  {
    id: "platinum",
    name: "Platinum",
    pp: 840,
    price: 9000,
    premium: true,
    benefits: [
      "Rang Platinum immédiat",
      "Revenus résiduels activés",
      "Accès direct à la direction RMM",
      "Stratégie business 1-on-1",
      "Place réservée au sommet annuel",
    ],
  },
];

export const expertReviews = [
  {
    name: "Dr. Salma Ben Ali",
    specialty: "Dermatologue",
    institution: "Clinique Carthage, Tunis",
    quote: "La gamme SwisDerm distribuée par RMM allie rigueur scientifique suisse et tolérance cutanée remarquable. Je la recommande à mes patientes en quête d'efficacité douce.",
  },
  {
    name: "Dr. Karim Mansouri",
    specialty: "Médecin esthétique",
    institution: "Centre Médical Berges du Lac",
    quote: "Le B Cream et le 3S Capsule font partie de mes protocoles de routine pré et post-soin. Des résultats cliniques mesurables sur la qualité de peau.",
  },
  {
    name: "Dr. Imen Trabelsi",
    specialty: "Nutritionniste",
    institution: "Cabinet Sousse Médina",
    quote: "S-Factor et S Hydro complètent parfaitement une approche anti-âge globale. Une vraie cohérence entre nutrition cellulaire et soin topique.",
  },
];

export const networkerTestimonials = [
  {
    name: "Yasmine Khelifi",
    rank: "Diamond" as const,
    location: "Tunis",
    income: "12 500 TND / mois",
    quote: "RMM a transformé ma carrière. En 18 mois, je suis passée d'employée à entrepreneure indépendante avec une équipe de 40 personnes.",
  },
  {
    name: "Ahmed Bouzid",
    rank: "Gold" as const,
    location: "Sfax",
    income: "5 200 TND / mois",
    quote: "Le pack Gold m'a donné toutes les clés. Formation, mentor, événements — un écosystème pensé pour réussir.",
  },
  {
    name: "Lina Trabelsi",
    rank: "Silver" as const,
    location: "Sousse",
    income: "2 800 TND / mois",
    quote: "Je cumule RMM avec mon emploi. Liberté totale, produits que j'utilise vraiment, et une communauté incroyable.",
  },
];

export function formatTND(amount: number) {
  return new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(amount) + " TND";
}
