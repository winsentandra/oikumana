import type { Locale } from "./types";

export const locales: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
];

const strings = {
  en: {
    searchPlaceholder: "Search Oikumana",
    about: "About",
    alpha: "Alpha",
    all: "All",
    deanery: "Deanery",
    consecrated: "Consecrated",
    readMore: "Read more",
    readLess: "Read less",
    nearestTransits: "Nearest transits",
    address: "Address",
    getDirections: "Get directions",
    noResults: "No churches match that search.",
    noResultsHint: "Try a parish, a region, or part of a church's name.",
    emptyRegion: "No churches listed in this region yet.",
    openList: "Open the church list",
    closeList: "Close the church list",
    closePanel: "Close",
    clearSearch: "Clear search",
    changeLanguage: "Change language",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    locate: "Show my location",
    openAbout: "About Oikumana",
    churchList: "Churches",
    aboutTitle: "What is this?",
    aboutWho: "Who are you?",
    portfolio: "My portfolio website",
    aboutBody: [
      "**Oikumana** is a simple, interactive catalogue map of the Catholic churches in Indonesia. For each parish, you can find its history, address, consecration date, and nearby transit options, whether you're planning a visit, researching a church's background, or just curious about what's around you.",
      "Right now the map **only covers the Archdiocese of Jakarta**, but this is very much **a living project**. I'll be updating it incrementally, adding more parishes, refining details, and improving the experience over time, so if something's missing today, it may well be there in a future update.",
      'PS: The name "Oikumana" is a play on words, combining "Oikumene" with the Indonesian "mana," meaning "where."',
    ],
    aboutWhoBody: [
      "I'm **Winsen Tandra**, a digital designer by trade. This project started as a personal exploration of the places I've long felt drawn to, and the histories they carry. If you'd like to see more of my work, you can check out my website linked below.",
    ],
  },
  id: {
    searchPlaceholder: "Cari Oikumana",
    about: "Tentang",
    alpha: "Alpha",
    all: "Semua",
    deanery: "Dekenat",
    consecrated: "Diberkati",
    readMore: "Baca selengkapnya",
    readLess: "Tutup",
    nearestTransits: "Transportasi terdekat",
    address: "Alamat",
    getDirections: "Petunjuk arah",
    noResults: "Tidak ada gereja yang cocok.",
    noResultsHint: "Coba nama paroki, wilayah, atau sebagian nama gereja.",
    emptyRegion: "Belum ada gereja terdaftar di wilayah ini.",
    openList: "Buka daftar gereja",
    closeList: "Tutup daftar gereja",
    closePanel: "Tutup",
    clearSearch: "Hapus pencarian",
    changeLanguage: "Ganti bahasa",
    zoomIn: "Perbesar",
    zoomOut: "Perkecil",
    locate: "Tampilkan lokasi saya",
    openAbout: "Tentang Oikumana",
    churchList: "Gereja",
    aboutTitle: "Apa ini?",
    aboutWho: "Siapa kamu?",
    portfolio: "Situs portofolio saya",
    aboutBody: [
      "**Oikumana** adalah peta katalog interaktif sederhana untuk gereja-gereja Katolik di Indonesia. Untuk setiap paroki, kamu bisa menemukan sejarah, alamat, tanggal pemberkatan, dan pilihan transportasi terdekat.",
      "Saat ini peta ini **baru mencakup Keuskupan Agung Jakarta**, tetapi ini benar-benar **proyek yang hidup**. Saya akan memperbaruinya secara bertahap, menambah paroki, dan menyempurnakan detailnya dari waktu ke waktu.",
      'PS: Nama "Oikumana" adalah permainan kata, menggabungkan "Oikumene" dengan kata "mana" dalam bahasa Indonesia.',
    ],
    aboutWhoBody: [
      "Saya **Winsen Tandra**, seorang desainer digital. Proyek ini bermula sebagai eksplorasi pribadi atas tempat-tempat yang lama menarik perhatian saya, beserta sejarah yang dikandungnya.",
    ],
  },
} as const;

type Strings = (typeof strings)["en"];
export type StringKey = keyof Strings;

/** Generic over the key so each call gets that entry's exact type back. */
export function t<K extends StringKey>(locale: Locale, key: K): Strings[K] {
  return strings[locale][key] as Strings[K];
}

export const PORTFOLIO_URL = "https://winsentandra.com";

/** Formats an ISO date the way the mockups show it: "21 April 1901". */
export function formatConsecrated(iso: string, locale: Locale) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Renders "300 m" / "1,6 km" style distances. */
export function formatDistance(metres: number, locale: Locale) {
  if (metres < 1000) return `${metres} m`;
  const km = metres / 1000;
  return `${new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", {
    maximumFractionDigits: 1,
  }).format(km)} km`;
}
