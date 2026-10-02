export interface SeoFaqItem {
  answer: string;
  question: string;
}

export interface SeoRelatedLink {
  label: string;
  path: string;
}

export interface SeoContentPage {
  benefits: string[];
  disclaimer: string;
  faq: SeoFaqItem[];
  h1: string;
  howToSteps: string[];
  intro: string;
  jsonLd: {
    breadcrumb: boolean;
    faq: boolean;
  };
  metaDescription: string;
  path: string;
  platformName?: string;
  relatedLinks: SeoRelatedLink[];
  slug: string;
  title: string;
}

const standardDisclaimer =
  "Gunakan FastVid hanya untuk konten publik atau konten yang pengguna punya izin untuk akses. FastVid tidak menyimpan video di server dan tidak berafiliasi dengan platform sosial media mana pun.";

const coreFaq: SeoFaqItem[] = [
  {
    question: "Apakah perlu login pengguna?",
    answer: "Tidak. Halaman publik FastVid dirancang untuk memproses link publik tanpa login pengguna."
  },
  {
    question: "Apakah FastVid menyimpan video di server?",
    answer: "Tidak. FastVid tidak dirancang untuk menyimpan file video di server."
  },
  {
    question: "Konten seperti apa yang boleh diproses?",
    answer: "Gunakan hanya konten publik atau konten yang pengguna punya izin untuk akses."
  }
];

export const homeSeoContent: SeoContentPage = {
  slug: "home",
  path: "/",
  title: "FastVid - Download Video Sosmed Tanpa Login",
  metaDescription: "Simpan video publik dari sosmed dengan FastVid, web utility untuk link publik tanpa login pengguna.",
  h1: "Download Video Sosmed Tanpa Login",
  intro:
    "FastVid by Wahyu Andika Putra adalah web utility untuk memproses link video publik atau konten yang pengguna punya izin untuk akses.",
  benefits: [
    "Membantu memproses link video publik dari berbagai sosial media.",
    "Tidak perlu login pengguna untuk memakai halaman publik.",
    "Tidak menyimpan video di server.",
    "Mengarahkan pengguna pada penggunaan yang aman, wajar, dan patuh."
  ],
  howToSteps: [
    "Salin link video publik dari platform sosial media.",
    "Tempel link ke halaman utama FastVid.",
    "Sistem memvalidasi format URL, platform, dan aturan keamanan.",
    "Jika integrasi resmi tersedia, opsi yang sesuai akan ditampilkan."
  ],
  faq: [
    {
      question: "Apakah FastVid gratis?",
      answer:
        "FastVid disiapkan sebagai alat web untuk memvalidasi link video publik. Ketersediaan fitur mengikuti integrasi resmi yang aktif."
    },
    ...coreFaq,
    {
      question: "Platform apa saja yang didukung?",
      answer: "Daftar platform publik dibaca dari API dan hanya tampil ketika statusnya aktif untuk publik."
    }
  ],
  disclaimer: standardDisclaimer,
  relatedLinks: [
    { label: "Download Video Sosmed", path: "/download-video-sosmed" },
    { label: "Download Video Tanpa Login", path: "/download-video-tanpa-login" },
    { label: "Video Downloader Online", path: "/video-downloader-online" },
    { label: "Cara Download Video Sosmed", path: "/cara-download-video-sosmed" },
    { label: "Simpan Video Publik", path: "/simpan-video-publik" },
    { label: "FAQ FastVid", path: "/faq" }
  ],
  jsonLd: {
    breadcrumb: false,
    faq: true
  }
};

export const platformsSeoContent: SeoContentPage = {
  slug: "platforms",
  path: "/platforms",
  title: "Platform yang Didukung - FastVid",
  metaDescription: "Lihat platform sosial media publik yang sedang disiapkan dan aktif di FastVid untuk pemrosesan link publik.",
  h1: "Platform yang Didukung",
  intro:
    "Halaman ini merangkum platform sosial media yang disiapkan untuk pemrosesan link video publik di FastVid.",
  benefits: [
    "Status platform ditampilkan dari API publik FastVid.",
    "Hanya informasi publik yang ditampilkan pada halaman ini.",
    "Platform dapat disiapkan, aktif, atau berada dalam pemeliharaan."
  ],
  howToSteps: [
    "Buka daftar platform untuk melihat status terbaru.",
    "Pilih halaman panduan yang sesuai dengan sumber link publik.",
    "Kembali ke halaman utama untuk memvalidasi link.",
    "Gunakan hanya konten publik atau konten yang pengguna punya izin untuk akses."
  ],
  faq: [
    {
      question: "Mengapa platform tertentu belum aktif?",
      answer: "Platform hanya aktif jika integrasi resmi dan aturan keamanan sudah siap."
    },
    ...coreFaq
  ],
  disclaimer: standardDisclaimer,
  relatedLinks: [
    { label: "Download Video Sosmed", path: "/download-video-sosmed" },
    { label: "Download Video TikTok", path: "/download-video-tiktok" },
    { label: "Download Video Instagram", path: "/download-video-instagram" },
    { label: "FAQ FastVid", path: "/faq" }
  ],
  jsonLd: {
    breadcrumb: true,
    faq: true
  }
};

export const platformSeoPages: SeoContentPage[] = [
  {
    slug: "download-video-sosmed",
    path: "/download-video-sosmed",
    title: "Download Video Sosmed Tanpa Login - FastVid",
    metaDescription: "Download video sosmed dari link publik dengan FastVid, web utility tanpa login pengguna dan tanpa menyimpan video.",
    h1: "Download Video Sosmed",
    intro:
      "Gunakan FastVid untuk memproses link video sosial media yang bersifat publik atau konten yang pengguna punya izin untuk akses.",
    benefits: [
      "Cocok untuk alur download video dari link sosmed yang publik.",
      "Tidak perlu login pengguna pada halaman publik.",
      "Membantu memeriksa platform dan format URL sebelum proses lanjut.",
      "Konten diarahkan pada penggunaan yang aman dan patuh."
    ],
    howToSteps: [
      "Salin link video publik dari sosial media.",
      "Buka halaman utama FastVid.",
      "Tempel link dan jalankan validasi.",
      "Ikuti opsi yang tersedia jika provider resmi sudah aktif."
    ],
    faq: [
      {
        question: "Apa itu download video sosmed di FastVid?",
        answer: "Ini adalah alur untuk memproses link video publik dari sosial media dengan validasi keamanan."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Platform yang Didukung", path: "/platforms" },
      { label: "Download Video Tanpa Login", path: "/download-video-tanpa-login" },
      { label: "Video Downloader Online", path: "/video-downloader-online" },
      { label: "Cara Download Video Sosmed", path: "/cara-download-video-sosmed" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "download-video-tiktok",
    path: "/download-video-tiktok",
    platformName: "TikTok",
    title: "Download Video TikTok Publik - FastVid",
    metaDescription: "Halaman FastVid untuk memproses link video TikTok publik tanpa login pengguna dan tanpa klaim afiliasi.",
    h1: "Download Video TikTok",
    intro:
      "Tempel link video TikTok publik untuk divalidasi oleh FastVid. Gunakan hanya untuk konten publik atau konten yang pengguna punya izin untuk akses.",
    benefits: [
      "Membantu mengenali link TikTok publik.",
      "Tidak perlu login pengguna di halaman publik FastVid.",
      "Tidak menyimpan video di server.",
      "Memberi konteks penggunaan yang patuh dan tidak berafiliasi."
    ],
    howToSteps: [
      "Salin link video TikTok yang bersifat publik.",
      "Buka halaman utama FastVid.",
      "Tempel link dan jalankan validasi.",
      "Gunakan opsi yang tersedia hanya jika integrasi resmi sudah aktif."
    ],
    faq: [
      {
        question: "Apakah FastVid berafiliasi dengan TikTok?",
        answer: "Tidak. FastVid tidak berafiliasi dengan TikTok atau platform sosial media mana pun."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Platform yang Didukung", path: "/platforms" },
      { label: "Download Video Tanpa Login", path: "/download-video-tanpa-login" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "download-video-instagram",
    path: "/download-video-instagram",
    platformName: "Instagram",
    title: "Download Video Instagram Publik - FastVid",
    metaDescription: "Validasi link video Instagram publik melalui FastVid tanpa login pengguna dan tanpa menyimpan video di server.",
    h1: "Download Video Instagram",
    intro:
      "FastVid membantu memproses link Instagram publik atau konten yang pengguna punya izin untuk akses dengan alur yang aman.",
    benefits: [
      "Mendukung intent simpan video publik dari sosmed.",
      "Tidak perlu login pengguna untuk memakai halaman publik.",
      "Validasi link dilakukan sebelum proses provider.",
      "Tidak mengklaim afiliasi dengan Instagram."
    ],
    howToSteps: [
      "Salin link Instagram yang dapat diakses publik.",
      "Tempel link di halaman utama FastVid.",
      "Tunggu validasi format dan platform.",
      "Lanjutkan hanya pada opsi yang tersedia secara resmi."
    ],
    faq: [
      {
        question: "Apakah FastVid berafiliasi dengan Instagram?",
        answer: "Tidak. FastVid tidak berafiliasi dengan Instagram atau platform sosial media mana pun."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Platform yang Didukung", path: "/platforms" },
      { label: "Simpan Video Publik", path: "/simpan-video-publik" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "download-video-facebook",
    path: "/download-video-facebook",
    platformName: "Facebook",
    title: "Download Video Facebook Publik - FastVid",
    metaDescription: "Validasi link video Facebook publik dengan FastVid untuk konten yang boleh pengguna akses.",
    h1: "Download Video Facebook",
    intro:
      "Gunakan halaman ini untuk memahami alur pemrosesan link video Facebook publik dengan FastVid.",
    benefits: [
      "Membantu memvalidasi link Facebook publik.",
      "Tidak perlu login pengguna pada halaman publik.",
      "Tidak menyimpan video di server.",
      "Menjaga pesan kepatuhan tetap jelas."
    ],
    howToSteps: [
      "Pastikan link Facebook bersifat publik atau boleh Anda akses.",
      "Buka halaman utama FastVid.",
      "Tempel link untuk validasi.",
      "Gunakan hasil yang tersedia sesuai status provider."
    ],
    faq: [
      {
        question: "Apakah FastVid berafiliasi dengan Facebook?",
        answer: "Tidak. FastVid tidak berafiliasi dengan Facebook atau platform sosial media mana pun."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Platform yang Didukung", path: "/platforms" },
      { label: "Video Downloader Online", path: "/video-downloader-online" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "download-video-twitter",
    path: "/download-video-twitter",
    platformName: "X/Twitter",
    title: "Download Video Twitter dan X Publik - FastVid",
    metaDescription: "Validasi link video Twitter atau X publik melalui FastVid dengan alur tanpa login pengguna.",
    h1: "Download Video Twitter dan X",
    intro:
      "FastVid membantu memproses link video Twitter atau X yang bersifat publik jika platform sudah aktif di API.",
    benefits: [
      "Menargetkan kebutuhan download video Twitter dan download video X secara natural.",
      "Tidak perlu login pengguna di halaman publik.",
      "Tidak menyimpan video di server.",
      "Tidak berafiliasi dengan X/Twitter."
    ],
    howToSteps: [
      "Salin link video Twitter atau X yang bersifat publik.",
      "Tempel link ke FastVid.",
      "Biarkan sistem memvalidasi URL dan platform.",
      "Ikuti opsi yang tersedia sesuai integrasi resmi."
    ],
    faq: [
      {
        question: "Apakah FastVid berafiliasi dengan X/Twitter?",
        answer: "Tidak. FastVid tidak berafiliasi dengan X/Twitter atau platform sosial media mana pun."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Platform yang Didukung", path: "/platforms" },
      { label: "Download Video Tanpa Login", path: "/download-video-tanpa-login" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "download-video-pinterest",
    path: "/download-video-pinterest",
    platformName: "Pinterest",
    title: "Download Video Pinterest Publik - FastVid",
    metaDescription: "Validasi link video Pinterest publik dengan FastVid tanpa menyimpan video di server.",
    h1: "Download Video Pinterest",
    intro:
      "Tempel link Pinterest publik untuk divalidasi oleh FastVid. Gunakan hanya untuk konten publik atau berizin.",
    benefits: [
      "Membantu memproses link Pinterest publik.",
      "Tidak perlu login pengguna pada halaman publik.",
      "Tidak menyimpan video di server.",
      "Tidak berafiliasi dengan Pinterest."
    ],
    howToSteps: [
      "Salin link Pinterest yang bersifat publik.",
      "Buka FastVid dan tempel link.",
      "Jalankan validasi URL.",
      "Gunakan opsi yang tersedia jika integrasi resmi sudah aktif."
    ],
    faq: [
      {
        question: "Apakah FastVid berafiliasi dengan Pinterest?",
        answer: "Tidak. FastVid tidak berafiliasi dengan Pinterest atau platform sosial media mana pun."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Platform yang Didukung", path: "/platforms" },
      { label: "Simpan Video Publik", path: "/simpan-video-publik" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  }
];

export const supportingSeoPages: SeoContentPage[] = [
  {
    slug: "cara-download-video-sosmed",
    path: "/cara-download-video-sosmed",
    title: "Cara Download Video Sosmed Tanpa Aplikasi - FastVid",
    metaDescription: "Panduan cara download video sosmed tanpa aplikasi untuk link publik atau konten yang pengguna punya izin untuk akses.",
    h1: "Cara Download Video Sosmed Tanpa Aplikasi",
    intro:
      "Panduan ini menjelaskan alur aman memakai FastVid sebagai downloader video sosial media untuk link yang bersifat publik.",
    benefits: [
      "Memahami langkah dasar dari salin link sampai validasi.",
      "Menghindari klaim berlebihan dan tetap fokus pada konten publik.",
      "Menggunakan web utility tanpa perlu memasang aplikasi tambahan."
    ],
    howToSteps: [
      "Pilih video sosial media yang bersifat publik.",
      "Salin link dari fitur bagikan platform.",
      "Buka FastVid di browser.",
      "Tempel link dan periksa hasil validasi yang tersedia."
    ],
    faq: [
      {
        question: "Apakah harus memasang aplikasi?",
        answer: "Tidak. FastVid adalah web utility yang dapat diakses dari browser."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Download Video TikTok", path: "/download-video-tiktok" },
      { label: "Download Video Instagram", path: "/download-video-instagram" },
      { label: "FAQ FastVid", path: "/faq" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "download-video-tanpa-login",
    path: "/download-video-tanpa-login",
    title: "Download Video Tanpa Login Pengguna - FastVid",
    metaDescription: "FastVid membantu memproses link video publik tanpa login pengguna, dengan fokus pada keamanan dan kepatuhan.",
    h1: "Download Video Tanpa Login Pengguna",
    intro:
      "Halaman ini menjelaskan bagaimana FastVid memosisikan alur download video tanpa login pengguna untuk konten publik.",
    benefits: [
      "Tidak meminta pengguna publik membuat akun.",
      "Tidak meminta kredensial platform sosial media.",
      "Tetap membatasi penggunaan pada konten publik atau berizin."
    ],
    howToSteps: [
      "Siapkan link video publik.",
      "Buka halaman utama FastVid.",
      "Tempel link tanpa memasukkan kredensial sosial media.",
      "Baca pesan validasi dan ikuti opsi resmi yang tersedia."
    ],
    faq: [
      {
        question: "Mengapa tanpa login pengguna penting?",
        answer: "Alur ini mengurangi kebutuhan memasukkan data akun pada halaman publik FastVid."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Video Downloader Online", path: "/video-downloader-online" },
      { label: "Simpan Video Publik", path: "/simpan-video-publik" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "video-downloader-online",
    path: "/video-downloader-online",
    title: "Video Downloader Online untuk Link Publik - FastVid",
    metaDescription: "Video downloader online FastVid membantu memvalidasi link video publik dari sosial media secara praktis.",
    h1: "Video Downloader Online",
    intro:
      "FastVid adalah video downloader online berbasis web untuk membantu memproses link video publik dari sosial media.",
    benefits: [
      "Berjalan dari browser tanpa instalasi tambahan.",
      "Memakai validasi URL sebelum proses lanjut.",
      "Menjaga pesan kepatuhan untuk konten publik dan berizin."
    ],
    howToSteps: [
      "Buka FastVid dari browser.",
      "Tempel link video publik dari sosial media.",
      "Periksa pesan validasi.",
      "Gunakan hasil sesuai status platform dan provider resmi."
    ],
    faq: [
      {
        question: "Apa maksud video downloader online di FastVid?",
        answer: "Maksudnya web utility yang membantu memproses link video publik melalui browser."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Download Video Facebook", path: "/download-video-facebook" },
      { label: "Download Video Twitter dan X", path: "/download-video-twitter" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "simpan-video-publik",
    path: "/simpan-video-publik",
    title: "Simpan Video Publik dari Sosmed - FastVid",
    metaDescription: "Pelajari cara simpan video publik dari sosmed dengan FastVid untuk konten yang pengguna punya izin untuk akses.",
    h1: "Simpan Video Publik dari Sosmed",
    intro:
      "Halaman ini menekankan batas penggunaan FastVid: memproses link video publik atau konten yang pengguna punya izin untuk akses.",
    benefits: [
      "Memperjelas batas konten publik dan berizin.",
      "Membantu pengguna memahami alur validasi link.",
      "Tidak menyimpan video di server FastVid."
    ],
    howToSteps: [
      "Pastikan konten dapat diakses secara publik atau Anda punya izin.",
      "Salin link dari platform sosial media.",
      "Tempel link ke FastVid.",
      "Gunakan hasil validasi secara bertanggung jawab."
    ],
    faq: [
      {
        question: "Apa yang dimaksud video publik?",
        answer: "Video publik adalah konten yang dapat diakses tanpa pembatasan akun khusus dari sisi pengguna."
      },
      ...coreFaq
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Cara Download Video Sosmed", path: "/cara-download-video-sosmed" },
      { label: "Download Video Instagram", path: "/download-video-instagram" },
      { label: "Download Video Pinterest", path: "/download-video-pinterest" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  },
  {
    slug: "faq",
    path: "/faq",
    title: "FAQ FastVid - Pertanyaan Umum",
    metaDescription: "FAQ FastVid tentang download video sosmed, konten publik, tanpa login pengguna, dan kepatuhan platform.",
    h1: "FAQ FastVid",
    intro:
      "Kumpulan jawaban singkat untuk pertanyaan umum tentang FastVid, penggunaan konten publik, dan batas kepatuhan.",
    benefits: [
      "Menjawab pertanyaan umum sebelum pengguna memproses link.",
      "Menjelaskan batas penggunaan secara ringkas.",
      "Menghubungkan pengguna ke halaman panduan yang relevan."
    ],
    howToSteps: [
      "Baca pertanyaan yang sesuai dengan kebutuhan Anda.",
      "Buka halaman panduan terkait jika perlu konteks tambahan.",
      "Gunakan FastVid hanya untuk konten publik atau berizin.",
      "Hubungi kanal resmi saat tersedia untuk pertanyaan operasional."
    ],
    faq: [
      {
        question: "Apa itu FastVid?",
        answer: "FastVid adalah web utility untuk memproses link video publik atau konten yang pengguna punya izin untuk akses."
      },
      {
        question: "Apakah FastVid perlu login pengguna?",
        answer: "Tidak. Halaman publik FastVid tidak memerlukan login pengguna."
      },
      {
        question: "Apakah FastVid menyimpan video di server?",
        answer: "Tidak. FastVid tidak menyimpan video di server."
      },
      {
        question: "Apakah FastVid berafiliasi dengan platform sosial media?",
        answer: "Tidak. FastVid tidak berafiliasi dengan platform sosial media mana pun."
      }
    ],
    disclaimer: standardDisclaimer,
    relatedLinks: [
      { label: "Download Video Sosmed", path: "/download-video-sosmed" },
      { label: "Download Video Tanpa Login", path: "/download-video-tanpa-login" },
      { label: "Platform yang Didukung", path: "/platforms" }
    ],
    jsonLd: {
      breadcrumb: true,
      faq: true
    }
  }
];

export const seoContentPages: SeoContentPage[] = [...platformSeoPages, ...supportingSeoPages];
export const allPublicSeoContentPages: SeoContentPage[] = [homeSeoContent, platformsSeoContent, ...seoContentPages];
