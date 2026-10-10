#!/usr/bin/env node
/* Stamps the shared page chrome (head boilerplate, skip link, header, mobile nav, footer) into every
   page, and regenerates sitemap.xml + robots.txt. Zero dependencies:   node build.mjs

   Pages stay plain, fully static HTML. Each page only authors what is unique to it (title,
   description, <main>); the regions between these markers are generated from partials/:

     <!-- build:head -->    ...  <!-- /build:head -->
     <!-- build:chrome -->  ...  <!-- /build:chrome -->
     <!-- build:footer -->  ...  <!-- /build:footer -->       (or "build:footer-min" for the slim footer)

   Edit a partial (or STRINGS below) and re-run the script instead of editing 22 files by hand. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://ahmedalyghaly.com/';
const EMAIL = 'ahmedalyghaly8@gmail.com';

/* English pages, in sitemap order. Every page has an "-ar" twin. */
const EN_PAGES = [
  'index', 'work', 'about', 'contact',
  'case-study-value-poly', 'case-study-clinica-jizel', 'case-study-arya-medical-center',
  'case-study-noor-almamzar', 'case-study-ab-interiors', 'case-study-car-clinic-garage', 'case-study-sfyr'
];

const STRINGS = {
  en: {
    dir: 'ltr', locale: 'en_US', suffix: '',
    siteName: 'Ahmed Aly Ghaly', skip: 'Skip to content',
    markTop: 'Ahmed Aly Ghaly, back to top', markHome: 'Ahmed Aly Ghaly, home',
    navLabel: 'Primary', bottomLabel: 'Primary, mobile',
    work: 'Work', about: 'About', contact: 'Contact',
    otherLang: 'ar', otherLangText: 'AR', otherLangLabel: 'العربية', otherDir: '',
    themeLabel: 'Light theme',
    footTitle: 'Have something to design and build?',
    sign: 'Web Developer &amp; UI/UX Designer, designing systems, building experiences, and obsessing over the details that nobody notices.',
    backTop: 'Back to top', backHome: 'Back home', mailDir: '',
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&display=swap'
  },
  ar: {
    dir: 'rtl', locale: 'ar_AE', suffix: '-ar',
    siteName: 'أحمد علي غالي', skip: 'تخطَّ إلى المحتوى',
    markTop: 'أحمد علي غالي، رجوع لفوق', markHome: 'أحمد علي غالي، الرئيسية',
    navLabel: 'التنقل الرئيسي', bottomLabel: 'التنقل السفلي',
    work: 'الأعمال', about: 'نبذة عني', contact: 'تواصل',
    otherLang: 'en', otherLangText: 'EN', otherLangLabel: 'English', otherDir: ' dir="ltr"',
    themeLabel: 'الوضع الفاتح',
    footTitle: 'عندك مشروع يستاهل تصميم صح؟',
    sign: 'مطور ويب ومصمم UI/UX، بصمم أنظمة، وأبني تجارب، ومهتم بالتفاصيل اللي محدش بيلاحظها.',
    backTop: 'رجوع لفوق', backHome: 'رجوع للرئيسية', mailDir: ' dir="ltr"',
    fonts: 'https://fonts.googleapis.com/css2?family=Changa:wght@400..800&family=IBM+Plex+Sans+Arabic:wght@300..700&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap'
  }
};

/* case-study type specimens that are real Google Fonts (class "fam-*" in the page -> family) */
const SPECIMEN_FONTS = {
  'fam-playfair': 'Playfair+Display', 'fam-poppins': 'Poppins', 'fam-cairo': 'Cairo', 'fam-tajawal': 'Tajawal',
  'fam-inter': 'Inter', 'fam-anton': 'Anton', 'fam-elmessiri': 'El+Messiri'
};

const read = f => readFileSync(f, 'utf8').split('\r\n').join('\n');
const write = (f, t) => writeFileSync(f, t.split('\n').join('\r\n'));
const partial = name => read(join(ROOT, 'partials', `${name}.html`)).replace(/\n$/, '');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in vars)) throw new Error(`missing template variable: ${k}`);
  return vars[k];
});
const escAttr = s => s.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/"/g, '&quot;');

const upstream = readdirSync(ROOT).filter(f => f.endsWith('.html'));
const known = new Set(EN_PAGES.flatMap(p => [`${p}.html`, `${p}-ar.html`]));
upstream.filter(f => !known.has(f)).forEach(f => console.warn(`warning: ${f} is not listed in EN_PAGES`));

const swap = (html, name, body, file) => {
  const re = new RegExp(`(<!-- build:${name}(?: [^>]*?)? -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`${file}: missing <!-- build:${name} --> region`);
  return html.replace(re, (_, open, close) => `${open}\n${body}\n${close}`);
};

for (const page of EN_PAGES) {
  for (const lang of ['en', 'ar']) {
    const t = STRINGS[lang], other = STRINGS[t.otherLang];
    const base = page + t.suffix;
    const file = `${base}.html`;
    const path = join(ROOT, file);
    let html = read(path);

    const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
    const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
    const home = page === 'index';
    const section = page === 'index' ? '' : page === 'about' ? 'about' : page === 'contact' ? 'contact' : 'work';
    const link = p => `${p}${t.suffix}.html`;
    const cur = s => (section === s ? ' aria-current="page"' : '');
    const specimens = [...new Set([...html.matchAll(/\bfam-[a-z]+/g)].map(m => m[0]))]
      .filter(c => SPECIMEN_FONTS[c]).map(c => `family=${SPECIMEN_FONTS[c]}`);

    const vars = {
      ...t,
      url: SITE + file, enUrl: SITE + `${page}.html`, arUrl: SITE + `${page}-ar.html`, site: SITE,
      ogAlt: other.locale,
      title: escAttr(title), desc,
      specimens: specimens.length
        ? `<link href="https://fonts.googleapis.com/css2?${specimens.join('&')}&display=swap" rel="stylesheet">\n` : '',
      markHref: home ? '#top' : link('index'),
      markLabel: home ? t.markTop : t.markHome,
      workHref: link('work'), aboutHref: link('about'), contactHref: link('contact'),
      curWork: cur('work'), curAbout: cur('about'), curContact: cur('contact'),
      pairHref: `${page}${other.suffix}.html`,
      email: EMAIL,
      legalHref: home ? '#top' : link('index'),
      legalText: home ? t.backTop : t.backHome
    };

    html = swap(html, 'head', fill(partial('head'), vars), file);
    html = swap(html, 'chrome', fill(partial('chrome'), vars), file);
    const footer = /<!-- build:footer-min /.test(html) ? 'footer-min' : 'footer';
    html = html.replace(/(<!-- build:footer(?:-min)? -->)[\s\S]*?(<!-- \/build:footer(?:-min)? -->)/,
      (_, o, c) => `${o}\n${fill(partial(footer), vars)}\n${c}`);
    write(path, html);
  }
}

/* sitemap.xml + robots.txt */
const urls = [...EN_PAGES.map(p => `${p}.html`), ...EN_PAGES.map(p => `${p}-ar.html`)];
write(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + `\n</urlset>\n`);
write(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);

console.log(`built ${EN_PAGES.length * 2} pages, sitemap.xml, robots.txt`);
