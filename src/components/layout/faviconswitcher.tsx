'use client';

import { useEffect } from 'react';

/* Подмена фавиконки по активности вкладки: активная — src/app/icon.svg
   (её генерирует Next, href с хэшем), неактивная — public/icon-inactive.svg.
   SVG сам не умеет реагировать на visibility, поэтому подменяем href
   у <link rel="icon"> по событию visibilitychange. Ничего не рендерит. */
export default function FaviconSwitcher() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;

    const activeHref = link.href;

    const onVisibilityChange = () => {
      link.href = document.hidden ? '/icon-inactive.svg' : activeHref;
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      link.href = activeHref;
    };
  }, []);

  return null;
}
