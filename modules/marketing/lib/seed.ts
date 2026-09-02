import type { Article } from "./types";

/**
 * La couche éditoriale de démonstration.
 *
 * Elle est indexée par identifiant de chantier : les chantiers livrés qui n'y
 * figurent pas sont simplement « à rédiger ». C'est voulu — la matière première
 * vient des chantiers, le marketing n'ajoute que du texte, et un chantier
 * terminé sans article doit apparaître comme une occasion manquée plutôt que
 * de disparaître.
 */
export const SEED_ARTICLES: Record<string, Partial<Article>> = {
  "w-01": {
    status: "publie",
    title: "Ouverture d'un mur porteur face à la mer, à Cagnes-sur-Mer",
    slug: "ouverture-mur-porteur-cagnes-sur-mer",
    excerpt:
      "Ouvrir un mur porteur dans un appartement des années soixante sans " +
      "toucher à la structure de l'immeuble : étude, calcul et pose d'une " +
      "poutre métallique en trois semaines.",
    context:
      "Les propriétaires souhaitaient réunir la cuisine et le séjour de leur " +
      "appartement en front de mer. Le mur à supprimer reprenait une partie " +
      "des charges de l'étage supérieur, dans un immeuble en béton armé des " +
      "années soixante dont les plans d'origine avaient disparu.",
    solution:
      "Après relevé sur site et sondages destructifs, nous avons établi la " +
      "descente de charges et dimensionné une poutre IPE 240 reprise sur deux " +
      "poteaux encastrés dans les murs de refend. La dépose s'est faite après " +
      "étaiement complet du plancher haut, en trois phases pour ne jamais " +
      "laisser la structure sans appui.",
    result:
      "Une ouverture de 3,20 mètres sans retombée visible, livrée en dix-huit " +
      "jours de chantier. L'attestation de solidité a été remise au syndic " +
      "avec la note de calcul.",
    keywords: [
      "ouverture mur porteur",
      "Cagnes-sur-Mer",
      "poutre métallique",
      "bureau d'études structure",
    ],
    photos: [
      { id: "p1", label: "sejour-avant.jpg", caption: "Le mur de refend avant travaux", kind: "avant" },
      { id: "p2", label: "etaiement.jpg", caption: "Étaiement du plancher haut", kind: "pendant" },
      { id: "p3", label: "sejour-apres.jpg", caption: "L'ouverture livrée, sans retombée", kind: "apres" },
    ],
    quote:
      "Le chantier a été tenu au jour près et l'appartement est méconnaissable. " +
      "Le fait d'avoir l'étude et les travaux au même endroit nous a évité " +
      "beaucoup d'allers-retours.",
    quote_author: "Mme Sanchez, propriétaire",
    published_at: "2026-06-18",
  },
  "w-03": {
    status: "publie",
    title: "Reprise en sous-œuvre d'une villa à Roquebrune-Cap-Martin",
    slug: "reprise-sous-oeuvre-villa-roquebrune",
    excerpt:
      "Des fissures évolutives sur une villa en restanques : diagnostic, " +
      "micropieux et reprise de fondations sur un terrain en pente.",
    context:
      "La villa présentait des fissures en escalier sur deux façades, " +
      "aggravées après un hiver pluvieux. Le terrain, en restanques, montrait " +
      "des signes de tassement différentiel côté aval.",
    solution:
      "Une mission géotechnique G2 a confirmé un sol hétérogène à faible " +
      "portance sur les deux premiers mètres. Nous avons dimensionné une " +
      "reprise par micropieux forés jusqu'au substratum, avec longrines de " +
      "redressement coulées en place, en deux tranches pour préserver " +
      "l'habitabilité.",
    result:
      "Structure stabilisée, fissures refermées après six mois de suivi. La " +
      "seconde tranche a été engagée dans la foulée par le même client.",
    keywords: [
      "reprise en sous-œuvre",
      "micropieux",
      "fissures",
      "Roquebrune-Cap-Martin",
    ],
    photos: [
      { id: "p1", label: "fissure-facade.jpg", caption: "Fissure en escalier, façade aval", kind: "avant" },
      { id: "p2", label: "micropieux.jpg", caption: "Forage des micropieux", kind: "pendant" },
    ],
    quote: "",
    quote_author: "",
    published_at: "2026-05-04",
  },
  "w-02": {
    status: "a_relire",
    title: "Renforcement d'un plancher commercial rue d'Antibes",
    slug: "renforcement-plancher-rue-antibes-cannes",
    excerpt:
      "Transformer un local commercial en surface d'exposition supposait de " +
      "doubler la charge admissible du plancher. Récit d'un renforcement en " +
      "site occupé.",
    context:
      "Le preneur souhaitait installer des présentoirs lourds sur un plancher " +
      "bois du XIXe, dimensionné pour de l'habitation. La charge d'exploitation " +
      "visée passait de 150 à 400 kg/m².",
    solution:
      "Nous avons conçu une structure métallique désolidarisée reprenant les " +
      "charges sur les murs porteurs, complétée d'une dalle collaborante de " +
      "8 cm. Le chantier s'est déroulé de nuit pour ne pas interrompre les " +
      "commerces voisins.",
    result: "",
    keywords: ["renforcement plancher", "dalle collaborante", "Cannes", "local commercial"],
    photos: [
      { id: "p1", label: "plancher-bois.jpg", caption: "Le plancher bois d'origine", kind: "avant" },
    ],
    quote: "",
    quote_author: "",
  },
  "w-05": {
    status: "brouillon",
    title: "Reprise d'enduits et de balcons — copropriété du Cannet",
    slug: "",
    excerpt: "",
    context:
      "Le syndic constatait des éclats de béton sous les balcons du bâtiment B, " +
      "avec aciers apparents sur trois niveaux.",
    solution: "",
    result: "",
    keywords: ["balcons", "copropriété", "Le Cannet"],
    photos: [],
    quote: "",
    quote_author: "",
  },
};
