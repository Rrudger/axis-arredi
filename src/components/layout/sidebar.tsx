import { clsx } from 'clsx';
import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { setUserLocale } from '@/lib/locale';
import { AtSign } from 'lucide-react';
import type { Locale } from '@/i18n/config';

/* Кастомные иконки меню — тот же контракт, что у lucide: viewBox 24,
   stroke=currentColor, strokeWidth 2, круглые концы. Цвет наследуется от
   меню (--color-menu-*), поэтому активный/неактивный/ховер работают. */
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/* О нас — тосканский casale: дом с башней (torre) и дверью. */
function TuscanHouseIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M3 10 8 5.5 13 10" />
      <path d="M3 10v11" />
      <path d="M13 7v14" />
      <path d="M13 7h6v14" />
      <path d="M3 21h16" />
      <path d="M7 21v-4h2v4" />
    </svg>
  );
}

/* Услуги — циркуль-измеритель: проектирование + точность ручной работы. */
function CraftIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <circle cx="12" cy="4" r="1.6" />
      <path d="M11 5 6.5 20" />
      <path d="M13 5 17.5 20" />
      <path d="M9.3 11h5.4" />
    </svg>
  );
}

/* Проекты — корпус-фасад: готовое изделие ателье (шкаф в проекции). */
function CabinetIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="15" rx="1" />
      <path d="M12 4v15" />
      <path d="M10 9.5v3" />
      <path d="M14 9.5v3" />
      <path d="M7.5 19v2" />
      <path d="M16.5 19v2" />
    </svg>
  );
}

const localeOrder = ['it', 'en', 'ru'] as const;

type Section = 'home' | 'projects' | 'portfolio' | 'contacts';

/* Пункты меню; порядок = порядок секций на странице. */
const menuItems = [
  { id: 'home',      label: 'menu.home',      Icon: TuscanHouseIcon },
  { id: 'projects',  label: 'menu.projects',  Icon: CraftIcon },
  { id: 'portfolio', label: 'menu.portfolio', Icon: CabinetIcon },
  { id: 'contacts',  label: 'menu.contacts',  Icon: AtSign },
] as const;

export default function Sidebar({ selected, switchSection }:
{
  selected: Section,
  switchSection: React.Dispatch<React.SetStateAction<Section>>
}) {
  const locale = useLocale();
  const t = useTranslations('main');
  const startTransition = useTransition()[1];
  const switchLang = (target: Locale) => {
    if (target === locale) return;
    const btn = document.getElementById('langBtn')!;
    btn.classList.remove('opacity-100');
    btn.classList.add('transition-opacity', 'opacity-0', 'duration-300');
    setTimeout(() => {
      startTransition(() => { setUserLocale(target); });
      btn.classList.remove('opacity-0');
      btn.classList.add('opacity-100');
    }, 300);
  };

  const activeClr   = 'text-[var(--color-menu-active)] border-[var(--color-menu-active)]';
  const inactiveClr = selected === 'contacts'
    ? 'text-[var(--color-menu-inactive-light)] border-transparent'
    : 'text-[var(--color-menu-inactive)] border-transparent';
  const activeText = activeClr.split(' ')[0];

  const [itemHovered, changeHovered] = useState<0 | Section>(0);
  // Активные цвета носит либо наведённый пункт, либо (без ховера) выбранный.
  const highlighted = itemHovered || selected;

  const handleSwitchSection = (id: Section) => {
    switchSection(id);
    // Раздел «Проекты» — это плитка. Если там открыт частный проект, пункт меню
    // должен вернуть к плитке, а не привести внутрь проекта: третий экран сам
    // слушает это событие и закрывает проект.
    if (id === 'portfolio') window.dispatchEvent(new Event('portfolio:home'));
    document.getElementById(`${id}Section`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
    <div id="mobileMenu" className={clsx(`fixed z-50
      bottom-0 left-1/2 -translate-x-1/2 w-[85vw] mb-3 rounded-2xl
      desktop:bottom-auto desktop:left-auto desktop:right-0 desktop:top-1/2 desktop:mb-0 desktop:rounded-none
      desktop:mr-8 desktop:w-auto desktop:translate-x-0 desktop:-translate-y-1/2
      t-title font-bold desktop:font-black
      bg-[var(--color-menu-plate)] backdrop-blur-xl ring-1 ring-primary-border/20
      desktop:bg-transparent desktop:backdrop-blur-none desktop:ring-0`,
      // Тёмные секции: контакты (таупе-треугольник) и первый экран на десктопе
      // (мозаика + тёмное фото) — светлый набор цветов меню. Класс действует
      // только в десктопном медиазапросе; на мобиле на home меню скрыто.
      (selected === 'contacts' || selected === 'home') && 'menu-on-dark',
      // Первый экран (home): на мобиле меню скрыто, на десктопе — остаётся.
      selected === 'home' && 'hidden desktop:block')}>

      <ul className='list-none flex flex-row items-stretch cursor-pointer
        desktop:flex-col desktop:text-right desktop:w-[200px]'>

        {/* Языковая кнопка */}
        {(() => {
          const nextLoc = localeOrder[(localeOrder.indexOf(locale as typeof localeOrder[number]) + 1) % localeOrder.length];
          return (
            <li
              id='langBtn'
              onClick={() => switchLang(nextLoc)}
              className={clsx(
                'flex-none flex items-center justify-center px-4 py-3',
                'desktop:justify-end desktop:pr-8 desktop:py-2 desktop:pb-3 desktop:border-r-4',
                'tracking-widest cursor-pointer hover:opacity-75 transition-opacity duration-300',
                activeText,
                inactiveClr.split(' ')[1],
              )}
            >
              {/* Мобайл: только активный язык, размер как у иконок */}
              <span className="desktop:hidden t-display font-bold leading-none">
                {locale.toUpperCase()}
              </span>
              {/* Десктоп: активный + линия + следующий */}
              <div className="hidden desktop:flex flex-col items-end gap-[5px]">
                <span className="t-title font-bold leading-none tracking-widest">
                  {locale.toUpperCase()}
                </span>
                <div className="w-7 h-px bg-current opacity-50" />
                <span className="t-label font-normal opacity-35 leading-none tracking-widest">
                  {nextLoc.toUpperCase()}
                </span>
              </div>
            </li>
          );
        })()}
        {menuItems.map(({ id, label, Icon }) => (
          <li key={id} id={id}
            onClick={() => handleSwitchSection(id)}
            onMouseEnter={() => changeHovered(id)}
            onMouseLeave={() => changeHovered(0)}
            className={clsx(
              'flex-1 flex items-center justify-center py-3',
              'desktop:flex-none desktop:justify-end desktop:pr-8 desktop:py-4 desktop:border-r-4',
              'transition-colors duration-700 ease-in-out',
              highlighted === id ? activeClr : inactiveClr,
              itemHovered === id && 'scale-110',
            )}>
            {/* Подпись пункта — ТОЛЬКО десктоп, где она заменяет иконку при
                наведении. На мобиле подписи нет никогда: тач-устройство на
                тапе порождает mouseenter (а mouseleave — нет), из-за чего
                пункт залипал текстом вместо иконки. Скрываем подпись
                медиазапросом, а не условием на itemHovered: состояние ховера
                нужно сохранить, оно красит активный пункт. */}
            {itemHovered === id && (
              <span className="hidden desktop:inline">{t(label)}</span>
            )}
            {/* Иконка с точкой-индикатором — на мобиле всегда; на десктопе у
                наведённого пункта уступает место подписи (одна display-утилита
                в каждый момент, иначе contents и hidden конфликтуют). */}
            <span className={clsx(
              'flex flex-col items-center gap-1',
              itemHovered === id ? 'desktop:hidden' : 'desktop:contents',
            )}>
              <Icon className='sm:size-[32px] size-[24px]' />
              <span className={clsx('desktop:hidden w-1 h-1 rounded-full transition-all duration-300', selected === id ? 'opacity-100 bg-current' : 'opacity-0')} />
            </span>
          </li>
        ))}
      </ul>
    </div>
    </>
  )
}
