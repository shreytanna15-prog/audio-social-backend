/**
 * Curated publish genres (exactly 30). Validate with Zod — do not use a Postgres ENUM.
 * Tracks may select 1–3 of these ids.
 */
export const TRACK_GENRES = [
    "pop",
    "hip_hop_rap",
    "rnb_soul",
    "electronic_edm",
    "rock",
    "indie",
    "folk",
    "jazz",
    "western_classical",
    "ambient_lofi",
    "metal",
    "soundtrack",
    "experimental",
    "bollywood_filmi",
    "indie_indian",
    "hindustani_classical",
    "carnatic_classical",
    "devotional",
    "ghazal",
    "sufi",
    "punjabi_bhangra",
    "desi_hip_hop",
    "indian_fusion",
    "tamil",
    "telugu",
    "malayalam",
    "kannada",
    "bengali",
    "marathi",
    "gujarati",
] as const;

export type TrackGenreId = (typeof TRACK_GENRES)[number];

export const TRACK_GENRE_LABELS: Record<TrackGenreId, string> = {
    pop: "Pop",
    hip_hop_rap: "Hip-Hop / Rap",
    rnb_soul: "R&B / Soul",
    electronic_edm: "Electronic / EDM",
    rock: "Rock",
    indie: "Indie",
    folk: "Folk",
    jazz: "Jazz",
    western_classical: "Classical (Western)",
    ambient_lofi: "Ambient / Lo-fi",
    metal: "Metal",
    soundtrack: "Soundtrack",
    experimental: "Experimental",
    bollywood_filmi: "Bollywood / Filmi",
    indie_indian: "Indie Indian",
    hindustani_classical: "Hindustani Classical",
    carnatic_classical: "Carnatic Classical",
    devotional: "Devotional",
    ghazal: "Ghazal",
    sufi: "Sufi",
    punjabi_bhangra: "Punjabi / Bhangra",
    desi_hip_hop: "Desi Hip-Hop",
    indian_fusion: "Indian Fusion",
    tamil: "Tamil",
    telugu: "Telugu",
    malayalam: "Malayalam",
    kannada: "Kannada",
    bengali: "Bengali",
    marathi: "Marathi",
    gujarati: "Gujarati",
};

export const MAX_TRACK_GENRES = 3;
export const MAX_TRACK_KEYWORDS = 5;
