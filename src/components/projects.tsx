'use client';

import { forwardRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import PortfolioGrid from '@/components/portfolio/grid';
import ProjectDetail from '@/components/portfolio/detail';
import { type MediaItem } from '@/components/portfolio/media';
import { PROJECTS, projectIndexBySlug } from '@/lib/projects';

/* Третий экран целиком: список проектов, а по клику по контейнеру — страница
   этого проекта на том же месте. Секцией (высота, фон, id для меню и
   наблюдателя из page.tsx) владеет этот контейнер, поэтому переключение
   список ⇄ проект не трогает ни скролл одностраничника, ни меню.

   Открытый проект живёт в адресе (?project=<slug>): работает и «назад»
   браузера, и присланная ссылка сразу на проект. */

const PARAM = 'project';

/* Адрес как внешний источник состояния. popstate ловит «назад» браузера, а
   notifyUrl — наши собственные pushState/replaceState (они события не шлют).
   Один и тот же notifyUrl в addEventListener регистрируется один раз, сколько
   бы подписчиков ни пришло. */
const urlListeners = new Set<() => void>();
const notifyUrl = () => urlListeners.forEach(fn => fn());
const readSlug = () => new URLSearchParams(window.location.search).get(PARAM);
const subscribeUrl = (fn: () => void) => {
  urlListeners.add(fn);
  window.addEventListener('popstate', notifyUrl);
  return () => {
    urlListeners.delete(fn);
    if (urlListeners.size === 0) window.removeEventListener('popstate', notifyUrl);
  };
};

const Projects = forwardRef<HTMLDivElement>((_, ref) => {
  // Медиа проектов подтягиваются из папок public/images/projects/* через API —
  // порядок и состав меняются вслед за файлами, без правок кода. media[i] —
  // отсортированный список фото и видео i-го проекта (файл «0…» первый).
  // Запрос один на весь экран: и обложки списка, и мозаика проекта — отсюда.
  const [media, setMedia] = useState<MediaItem[][]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/project-photos')
      .then(r => r.json())
      .then((d: { media: MediaItem[][] }) => { if (alive) setMedia(d.media ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Открытый проект не дублируется в состоянии — он читается прямо из адреса.
  // Копия рассинхронизировалась бы с «назад» браузера, а так источник один.
  // Серверный снимок — null: на сервере адреса ещё нет, экран отдаётся списком,
  // и React сам перерисует его после гидрации, если в ссылке есть проект.
  const slug = useSyncExternalStore(subscribeUrl, readSlug, () => null);
  const index = projectIndexBySlug(slug);
  const open = index >= 0 ? index : null;

  // Своя запись в истории есть только у проекта, открытого кликом по списку.
  // По ней стрелка «назад» решает, уйти в history.back() (тогда адрес и стрелка
  // ведут себя одинаково) или просто вычистить параметр.
  const pushed = useRef(false);

  // Глубокая ссылка (?project=…): экран проекта должен быть и перед глазами,
  // а не просто отрисован третьим по счёту.
  useEffect(() => {
    if (projectIndexBySlug(readSlug()) >= 0)
      document.getElementById('portfolioSection')?.scrollIntoView();
  }, []);

  const openProject = (i: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM, PROJECTS[i].slug);
    window.history.pushState(null, '', url);
    pushed.current = true;
    notifyUrl();
    // Список проектов на мобиле выше экрана, и открыть проект могли с любого
    // его места. Страница проекта — ровно в экран, так что подводим секцию к
    // верху: иначе он открылся бы наполовину прокрученным.
    document.getElementById('portfolioSection')?.scrollIntoView();
  };

  // viaHistory=true — возврат стрелкой: отматываем свою запись назад.
  // false — уход по другому поводу (CTA, меню): историю не крутим, иначе
  // браузер восстановит прежний скролл и перебьёт наш переход к секции.
  const closeProject = (viaHistory: boolean) => {
    if (viaHistory && pushed.current) { pushed.current = false; window.history.back(); return; }
    const url = new URL(window.location.href);
    url.searchParams.delete(PARAM);
    window.history.replaceState(null, '', url);
    pushed.current = false;
    notifyUrl();
  };

  // Пункт меню «Проекты» при открытом проекте возвращает к списку — иначе
  // переход в раздел приводил бы в частный проект. Событие шлёт сайдбар.
  useEffect(() => {
    const home = () => closeProject(false);
    window.addEventListener('portfolio:home', home);
    return () => window.removeEventListener('portfolio:home', home);
  }, []);

  const goContacts = () => {
    closeProject(false);
    document.getElementById('contactsSection')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={ref}
      id="portfolioSection"
      className={`pf-section w-full bg-primary-bg ${open === null ? 'pf-section--list' : ''}`}
    >
      <style>{`
        @keyframes pf-swap-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pf-swap { width: 100%; height: 100%; animation: pf-swap-in 0.35s ease forwards; }
        @media (prefers-reduced-motion: reduce) { .pf-swap { animation: none; } }

        .pf-section { height: 100vh; overflow: hidden; }
        /* Мобильный список идёт всеми проектами подряд и в экран не влезает —
           под ним секция растёт, и его проходят прокруткой страницы. Страница
           открытого проекта по-прежнему ровно в экран: у неё свой скролл
           мозаики, и вторая прокрутка снаружи только мешала бы. */
        @media (max-width: 1022px) {
          .pf-section--list { height: auto; min-height: 100vh; }
        }
      `}</style>

      <div key={open === null ? 'grid' : `project-${open}`} className="pf-swap">
        {open === null ? (
          <PortfolioGrid media={media} onOpen={openProject} />
        ) : (
          <ProjectDetail
            index={open}
            media={media[open] ?? []}
            onBack={() => closeProject(true)}
            onContact={goContacts}
          />
        )}
      </div>
    </div>
  );
});

Projects.displayName = 'Projects';
export default Projects;
