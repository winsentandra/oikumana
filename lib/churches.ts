import type { Church } from "./types";

/**
 * Seed data for the Archdiocese of Jakarta.
 *
 * Real churches, real coordinates, real addresses. The `history` copy is
 * placeholder-grade beyond the two entries transcribed from the mockups —
 * swapping in the final text is a change to this file and nothing else.
 */
export const churches: Church[] = [
  {
    slug: "our-lady-of-the-assumption",
    name: {
      en: "The Church of Our Lady of the Assumption",
      id: "Gereja Santa Maria Pelindung Diangkat Ke Surga",
    },
    category: { en: "Cathedral", id: "Katedral" },
    parish: "Katedral Parish",
    deanery: { en: "Central Jakarta", id: "Jakarta Pusat" },
    region: "Central Jakarta",
    consecratedOn: "1901-04-21",
    history: {
      en: [
        "The history of Jakarta Cathedral, and indeed of the Archdiocese of Jakarta itself, is rooted in the political upheaval of early 19th-century Europe. The rise of Louis Bonaparte, Napoleon's brother, as King of Holland brought various changes to that country and its colonies, including in matters of religion. After two centuries of prohibition, the practice of the Catholic faith was once again permitted in the Dutch East Indies.",
        "On 8 May 1807, Pope Pius VII created the Apostolic Prefecture of the East Indies, and sent two priests, Father Jacobus Nelissen and Father Lambertus Prinsen, who arrived in Batavia the following year. The first church rose on Buffelsveld, a modest structure of bamboo and timber that burned down in 1826 and was rebuilt in stone, only to collapse in 1890.",
        "Over the past century, Jakarta Cathedral has borne witness to numerous milestones in Indonesian history. Between 1962 and 1965, Indonesian bishops took part in the Second Vatican Council, which brought many changes to Catholic religious life. This period coincided with domestic political turmoil stemming from the fall of President Sukarno and the establishment of the New Order regime. Five years later, on 3–4 December, Pope Paul VI visited the Cathedral before leading a grand Mass at Senayan Stadium (Gelora Bung Karno), marking the first time the supreme leader of the Catholic Church visited Indonesia. A similar event was repeated on 9–14 October 1989 with the visit of Pope John Paul II, and again on 3–6 September 2024 with the visit of Pope Francis. On Christmas Eve, 24 December 2000, the Cathedral area was one of the sites of a bomb explosion in a series of terrorist attacks by Jemaah Islamiyah targeting a number of churches across various cities in Indonesia.",
        "Its long history, from a bamboo house in Buffelsveld to the neo-Gothic tower that stands today, makes Jakarta Cathedral more than just a house of worship. Designated a national cultural heritage site since 1999, the church stands directly facing Istiqlal Mosque, the largest mosque in Southeast Asia. Their close proximity has become a symbol of hope for harmonious relations among people of different faiths in Indonesia.",
      ].join("\n\n"),
      id: [
        "Sejarah Katedral Jakarta, dan juga Keuskupan Agung Jakarta itu sendiri, berakar pada pergolakan politik Eropa awal abad ke-19. Naiknya Louis Bonaparte, saudara Napoleon, sebagai Raja Belanda membawa berbagai perubahan bagi negara itu dan koloninya, termasuk dalam urusan agama. Setelah dua abad dilarang, praktik iman Katolik kembali diizinkan di Hindia Belanda.",
        "Pada 8 Mei 1807, Paus Pius VII mendirikan Prefektur Apostolik Hindia Belanda dan mengutus dua imam, Pastor Jacobus Nelissen dan Pastor Lambertus Prinsen, yang tiba di Batavia setahun kemudian. Gereja pertama berdiri di Buffelsveld, sebuah bangunan sederhana dari bambu dan kayu.",
        "Sepanjang seabad terakhir, Katedral Jakarta menjadi saksi berbagai tonggak sejarah Indonesia. Antara 1962 dan 1965, para uskup Indonesia mengikuti Konsili Vatikan II. Paus Paulus VI mengunjungi Katedral pada 3–4 Desember, menandai kunjungan pertama pemimpin tertinggi Gereja Katolik ke Indonesia, disusul Paus Yohanes Paulus II pada 1989 dan Paus Fransiskus pada 2024.",
        "Sejarah panjangnya, dari rumah bambu di Buffelsveld hingga menara neo-Gotik yang berdiri hari ini, menjadikan Katedral Jakarta lebih dari sekadar rumah ibadah. Ditetapkan sebagai cagar budaya nasional sejak 1999, gereja ini berhadapan langsung dengan Masjid Istiqlal, masjid terbesar di Asia Tenggara.",
      ].join("\n\n"),
    },
    transits: [
      { kind: "bus", name: "Halte TransJakarta Juanda", line: "Koridor 2", distanceM: 400 },
      { kind: "train", name: "Stasiun Juanda", distanceM: 500 },
    ],
    address:
      "Jalan Katedral No. 7B, Pasar Baru, Sawah Besar, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10710",
    coords: [-6.16944, 106.83306],
  },
  {
    slug: "santa-maria-de-fatima",
    name: {
      en: "The Church of Santa Maria de Fatima",
      id: "Gereja Santa Maria de Fatima",
    },
    category: { en: "Parish Church", id: "Gereja Paroki" },
    parish: "Toasebio Parish",
    deanery: { en: "West Jakarta", id: "Jakarta Barat" },
    region: "West Jakarta",
    consecratedOn: "1955-10-13",
    history: {
      en: [
        "Santa Maria de Fatima occupies a former Chinese merchant's residence in the heart of Glodok, and remains one of the most architecturally distinctive Catholic churches in Indonesia. The compound was bought by the Jesuits in 1953, and rather than demolish the building they consecrated it as it stood.",
        "The result is a church that reads first as a Chinese courtyard house: a green-tiled saddle roof, a pair of stone lions flanking the entrance, and calligraphic couplets running down the door posts. Only the crucifix above the threshold marks it as a church at all. The main hall retains its original timber structure, with the sanctuary set where the family altar once stood.",
        "The parish has served Jakarta's Chinese-Indonesian Catholic community for seven decades, and Mass is still celebrated in Mandarin alongside Indonesian. The building was listed as a protected cultural property in 1972.",
      ].join("\n\n"),
      id: [
        "Santa Maria de Fatima menempati bekas kediaman saudagar Tionghoa di jantung Glodok, dan tetap menjadi salah satu gereja Katolik dengan arsitektur paling khas di Indonesia. Kompleks ini dibeli oleh para Yesuit pada 1953, dan alih-alih merobohkannya, mereka memberkatinya apa adanya.",
        "Hasilnya adalah gereja yang pertama-tama tampak seperti rumah berhalaman Tionghoa: atap pelana berubin hijau, sepasang singa batu mengapit pintu masuk, dan bait kaligrafi di tiang pintu. Hanya salib di atas ambang yang menandainya sebagai gereja.",
        "Paroki ini telah melayani umat Katolik Tionghoa-Indonesia di Jakarta selama tujuh dekade, dan Misa masih dirayakan dalam bahasa Mandarin selain bahasa Indonesia. Bangunan ini ditetapkan sebagai cagar budaya pada 1972.",
      ].join("\n\n"),
    },
    transits: [
      { kind: "bus", name: "Halte TransJakarta Glodok", line: "Koridor 1", distanceM: 300 },
      { kind: "train", name: "Stasiun Jakarta Kota", distanceM: 300 },
    ],
    address:
      "Jalan Kemenangan III 47 RT03/02, Glodok, Taman Sari, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11120",
    coords: [-6.14528, 106.81361],
  },
  {
    slug: "santa-theresia",
    name: {
      en: "The Church of Saint Theresa",
      id: "Gereja Santa Theresia",
    },
    category: { en: "Parish Church", id: "Gereja Paroki" },
    parish: "Menteng Parish",
    deanery: { en: "Central Jakarta", id: "Jakarta Pusat" },
    region: "Central Jakarta",
    consecratedOn: "1936-10-04",
    history: {
      en: [
        "Built to serve the Dutch families settling the newly laid-out garden suburb of Menteng, Santa Theresia was designed in a restrained Art Deco idiom by the architect J. van Oyen and completed in 1934.",
        "Its plan is a broad basilica with a slender campanile set apart from the nave, a silhouette that has become one of the landmarks of the district. The interior is deliberately plain, with light entering through tall clerestory windows that run the full length of the building.",
      ].join("\n\n"),
      id: [
        "Dibangun untuk melayani keluarga-keluarga Belanda yang menghuni kawasan taman Menteng yang baru ditata, Santa Theresia dirancang dalam gaya Art Deco yang bersahaja oleh arsitek J. van Oyen dan selesai pada 1934.",
        "Denahnya berupa basilika lebar dengan menara lonceng ramping yang terpisah dari nave, siluet yang kini menjadi salah satu penanda kawasan ini.",
      ].join("\n\n"),
    },
    transits: [
      { kind: "bus", name: "Halte TransJakarta Menteng", line: "Koridor 1", distanceM: 450 },
      { kind: "mrt", name: "Stasiun MRT Bundaran HI", distanceM: 900 },
    ],
    address:
      "Jalan Gereja Theresia No. 2, Gondangdia, Menteng, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10350",
    coords: [-6.19306, 106.83194],
  },
  {
    slug: "hati-kudus-yesus-kramat",
    name: {
      en: "The Church of the Sacred Heart of Jesus",
      id: "Gereja Hati Kudus Yesus",
    },
    category: { en: "Parish Church", id: "Gereja Paroki" },
    parish: "Kramat Parish",
    deanery: { en: "Central Jakarta", id: "Jakarta Pusat" },
    region: "Central Jakarta",
    consecratedOn: "1923-06-08",
    history: {
      en: [
        "The Sacred Heart at Kramat is the second-oldest surviving parish church in Jakarta, raised in 1923 to relieve the pressure on the Cathedral as the city expanded southward along Kramat Raya.",
        "The building is neo-Gothic in outline but built in brick rather than stone, a concession to both cost and climate. Its rose window was assembled in Utrecht and shipped out in crates.",
      ].join("\n\n"),
      id: [
        "Hati Kudus Yesus di Kramat adalah gereja paroki tertua kedua yang masih berdiri di Jakarta, didirikan pada 1923 untuk meringankan beban Katedral seiring kota meluas ke selatan sepanjang Kramat Raya.",
        "Bangunannya bergaya neo-Gotik namun dibangun dari bata alih-alih batu, sebuah kompromi terhadap biaya sekaligus iklim.",
      ].join("\n\n"),
    },
    transits: [
      { kind: "bus", name: "Halte TransJakarta Kramat Sentiong", line: "Koridor 2", distanceM: 250 },
      { kind: "train", name: "Stasiun Kramat", distanceM: 700 },
    ],
    address:
      "Jalan Kramat Raya No. 134, Kramat, Senen, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10430",
    coords: [-6.18583, 106.84639],
  },
  {
    slug: "santo-yosef-matraman",
    name: {
      en: "The Church of Saint Joseph",
      id: "Gereja Santo Yosef",
    },
    category: { en: "Parish Church", id: "Gereja Paroki" },
    parish: "Matraman Parish",
    deanery: { en: "East Jakarta", id: "Jakarta Timur" },
    region: "East Jakarta",
    consecratedOn: "1934-03-19",
    history: {
      en: [
        "Saint Joseph at Matraman began as a chapel attached to a Catholic school, and grew into a full parish as the neighbourhoods east of the Ciliwung filled in through the 1930s.",
        "The present church replaced the original chapel in 1934 and was extended twice after independence. Its bell, cast in Semarang, is the oldest still in weekly use in the archdiocese.",
      ].join("\n\n"),
      id: [
        "Santo Yosef di Matraman bermula sebagai kapel yang menempel pada sekolah Katolik, dan tumbuh menjadi paroki penuh seiring kawasan di timur Ciliwung terisi sepanjang 1930-an.",
        "Gereja yang ada sekarang menggantikan kapel asli pada 1934 dan diperluas dua kali setelah kemerdekaan.",
      ].join("\n\n"),
    },
    transits: [
      { kind: "bus", name: "Halte TransJakarta Matraman Baru", line: "Koridor 4", distanceM: 350 },
      { kind: "train", name: "Stasiun Manggarai", distanceM: 1600 },
    ],
    address:
      "Jalan Matraman Raya No. 129, Kebon Manggis, Matraman, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13150",
    coords: [-6.20361, 106.85778],
  },
  {
    slug: "santa-perawan-maria-ratu",
    name: {
      en: "The Church of Mary Queen of the Universe",
      id: "Gereja Santa Perawan Maria Ratu",
    },
    category: { en: "Parish Church", id: "Gereja Paroki" },
    parish: "Blok Q Parish",
    deanery: { en: "South Jakarta", id: "Jakarta Selatan" },
    region: "South Jakarta",
    consecratedOn: "1971-05-31",
    history: {
      en: [
        "Known universally as Blok Q after the Kebayoran Baru housing block it was built to serve, this parish is a product of the post-independence expansion of Jakarta into its southern suburbs.",
        "The church is uncompromisingly modern: a shallow concrete shell roof over a fan-shaped plan, arranged so that no seat is more than fifteen rows from the altar — an early Indonesian response to the liturgical reforms of the Second Vatican Council.",
      ].join("\n\n"),
      id: [
        "Dikenal luas sebagai Blok Q, mengikuti blok perumahan Kebayoran Baru yang dilayaninya, paroki ini adalah produk perluasan Jakarta ke pinggiran selatan pasca-kemerdekaan.",
        "Gerejanya sepenuhnya modern: cangkang beton dangkal di atas denah berbentuk kipas, ditata agar tidak ada bangku yang berjarak lebih dari lima belas baris dari altar.",
      ].join("\n\n"),
    },
    transits: [
      { kind: "mrt", name: "Stasiun MRT Blok M BCA", distanceM: 800 },
      { kind: "bus", name: "Halte TransJakarta Blok M", line: "Koridor 1", distanceM: 850 },
    ],
    address:
      "Jalan Wolter Monginsidi No. 5, Rawa Barat, Kebayoran Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12180",
    coords: [-6.24167, 106.80139],
  },
];

/** Chip order: "All" first, then regions in the order they appear in the data. */
export const regions = Array.from(new Set(churches.map((c) => c.region)));

export function getChurch(slug: string): Church | undefined {
  return churches.find((c) => c.slug === slug);
}
