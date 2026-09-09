import type { Metadata } from "next";
import { Lora, Cinzel, Italianno, Playfair_Display, Great_Vibes } from "next/font/google";
import {NextIntlClientProvider} from 'next-intl';
import { getLocale } from 'next-intl/server';
import FaviconSwitcher from '@/components/layout/faviconswitcher';
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: '--font-cinzel',
  display: 'swap',
});

const italianno = Italianno({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-italianno',
  display: 'swap',
});

const lora = Lora({
  // cyrillic — для русской локализации (текст остаётся на Lora, у неё
  // полноценная кириллица); на en/it не влияет — грузится только нужный subset.
  // Только 400: все жирные начертания в проекте — у шрифта заголовков
  // (--font-sans), основной текст ходит одним регулярным весом.
  subsets: ['latin', 'cyrillic'],
  weight: ['400'],
  variable: '--font-lora',
  display: 'swap',
})

/* ── Русская локализация ─────────────────────────────────────────
   Cinzel и Italianno — латиница-only, в кириллице отваливаются в
   системный serif/cursive. Для ru подменяем их (через globals.css,
   селектор html[lang="ru"]) на кириллические аналоги той же
   стилистики: Playfair Display — витринный серив вместо Cinzel;
   Great Vibes — изящная тонкая каллиграфия (copperplate, XIX век) вместо
   Italianno. */
const playfair = Playfair_Display({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

const greatVibes = Great_Vibes({
  subsets: ['cyrillic', 'latin'],
  weight: ['400'],
  variable: '--font-greatvibes',
  display: 'swap',
});

/* ── Снимок вьюпорта до первой отрисовки ────────────────────────
   На Android высота вьюпорта при загрузке меняется уже ПОСЛЕ первого
   кадра: адресная строка и панели въезжают, и высота падает на 50–120px.
   Всё, что считалось по текущей высоте — медиазапросы `max-height` (наборы
   кеглей «компактный»/«тесный» в globals.css) и dvh в геометрии
   (services.tsx), — пересчитывалось на лету, и сайт на глазах уменьшался.

   Здесь высота меряется ОДИН раз, до первой отрисовки, и по «малому»
   вьюпорту (100svh — как если бы все панели браузера были показаны).
   svh, в отличие от innerHeight и dvh, не зависит от того, свёрнута ли
   адресная строка, поэтому значение стабильно и повторный замер на resize
   даёт то же самое — скачка нет ни при загрузке, ни при прокрутке.

   Результат — атрибут на <html>:
     data-vp="compact" — узкий ИЛИ низкий вьюпорт;
     data-vp="tight"   — узкий И низкий (360×700 и подобные);
     атрибута нет      — обычный мобильный/десктопный набор.
   Границы (374.98px по ширине, 740px по высоте, 1022px = ниже desktop:)
   те же, что были в медиазапросах, — см. комментарии в globals.css.

   Скрипт инлайновый и стоит первым в <body>: он блокирует разбор
   документа, поэтому атрибут уже проставлен, когда браузер рисует
   первый кадр. Без JS атрибута не будет — сайт получит базовый
   мобильный набор кеглей (React здесь всё равно обязателен). */
const VIEWPORT_SNAPSHOT = `(function(){
  var el = document.documentElement;
  var NARROW = 374.98, SHORT = 740, MOBILE = 1022;
  var hasSvh = !!(window.CSS && CSS.supports && CSS.supports('height','100svh'));
  var lastW = -1, lastH = 0;
  function measureH(){
    if (hasSvh) {
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
      (document.body || el).appendChild(probe);
      var h = probe.getBoundingClientRect().height;
      probe.parentNode.removeChild(probe);
      if (h > 0) return h;
    }
    /* Без svh замер повторить нечем — держим первое значение. */
    return lastH || window.innerHeight || el.clientHeight || 0;
  }
  function apply(){
    var w = el.clientWidth || window.innerWidth || 0;
    /* Без svh пересчитываем только при смене ширины (поворот, десктопный
       ресайз): высота там дышит вместе с адресной строкой. */
    if (w === lastW && !hasSvh) return;
    lastW = w;
    lastH = measureH();
    var narrow = w <= NARROW, short = w <= MOBILE && lastH <= SHORT;
    var vp = narrow && short ? 'tight' : (narrow || short) ? 'compact' : '';
    if (vp) el.setAttribute('data-vp', vp); else el.removeAttribute('data-vp');
  }
  apply();
  var frame = 0;
  window.addEventListener('resize', function(){
    if (frame) return;
    frame = requestAnimationFrame(function(){ frame = 0; apply(); });
  }, { passive: true });
})();`;

export const metadata: Metadata = {
  title: "Axis arredi",
  description: "Axis arredi — L'occhio vuole la sua parte",
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className={`${cinzel.variable} ${italianno.variable} ${lora.variable} ${playfair.variable} ${greatVibes.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: VIEWPORT_SNAPSHOT }} />
        <FaviconSwitcher />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
