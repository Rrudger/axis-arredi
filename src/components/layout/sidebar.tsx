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

export default function Sidebar({ selected, switchSection }:
{
  selected: number,
  switchSection: React.Dispatch<React.SetStateAction<number>>
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
  const activeText   = activeClr.split(' ')[0];
  const inactiveText = inactiveClr.split(' ')[0];

  const [itemHovered, changeHovered] = useState<0 | 'home' | 'projects' | 'portfolio' | 'contacts'>(0);
  const handleOnHover = (e) => {
    const item = e.target.closest('li');
    const selectedItem = document.getElementById(selected)!;
    changeHovered(item.id);
    selectedItem.classList.remove(...activeClr.split(' '))
    selectedItem.classList.add(...inactiveClr.split(' '))
    item.classList.remove(...inactiveClr.split(' '))
    item.classList.add('scale-110', ...activeClr.split(' '))
  };
  const handleOffHover = (e) => {
    const item = e.target.closest('li');
    changeHovered(0);
    const selectedItem = document.getElementById(selected)!;
    item.classList.remove('scale-110', ...activeClr.split(' '))
    item.classList.add(...inactiveClr.split(' '))
    selectedItem.classList.remove(...inactiveClr.split(' '))
    selectedItem.classList.add(...activeClr.split(' '))
  };
  const handleSwitchSection = (e) => {
    const item = e.target.closest('li');
    switchSection(item.id);
    document.getElementById(`${item.id}Section`)?.scrollIntoView({
    behavior: 'smooth',
  });
  }

  return (
    <>
    <div className={clsx(`fixed z-50
      bottom-0 left-1/2 -translate-x-1/2 w-[85vw] mb-3 rounded-2xl
      desktop:bottom-auto desktop:left-auto desktop:right-0 desktop:top-1/2 desktop:mb-0 desktop:rounded-none
      desktop:mr-8 desktop:w-auto desktop:translate-x-0 desktop:-translate-y-1/2
      t-title font-bold desktop:font-black
      bg-[var(--color-menu-plate)] backdrop-blur-xl ring-1 ring-primary-border/20
      desktop:bg-transparent desktop:backdrop-blur-none desktop:ring-0`,
      selected === 'contacts' && 'menu-on-dark')}>

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
        <li id='home' onClick={handleSwitchSection} onMouseEnter={handleOnHover} onMouseLeave={handleOffHover} className={clsx(
          'flex-1 flex items-center justify-center py-3',
          'desktop:flex-none desktop:justify-end desktop:pr-8 desktop:py-4 desktop:border-r-4',
          'transition-colors duration-700 ease-in-out',
          selected === 'home' ? activeClr : inactiveClr,
        )}>
          {itemHovered === 'home' ? t('menu.home') : (
            <span className="flex flex-col items-center gap-1 desktop:contents">
              <TuscanHouseIcon className='sm:size-[32px] size-[24px]' />
              <span className={clsx('desktop:hidden w-1 h-1 rounded-full transition-all duration-300', selected === 'home' ? 'opacity-100 bg-current' : 'opacity-0')} />
            </span>
          )}
        </li>
        <li id='projects' onClick={handleSwitchSection} onMouseEnter={handleOnHover} onMouseLeave={handleOffHover} className={clsx(
          'flex-1 flex items-center justify-center py-3',
          'desktop:flex-none desktop:justify-end desktop:pr-8 desktop:py-4 desktop:border-r-4',
          'transition-colors duration-700 ease-in-out',
          selected === 'projects' ? activeClr : inactiveClr,
        )}>
          {itemHovered === 'projects' ? t('menu.projects') : (
            <span className="flex flex-col items-center gap-1 desktop:contents">
              <CraftIcon className='sm:size-[32px] size-[24px]' />
              <span className={clsx('desktop:hidden w-1 h-1 rounded-full transition-all duration-300', selected === 'projects' ? 'opacity-100 bg-current' : 'opacity-0')} />
            </span>
          )}
        </li>
        <li id='portfolio' onClick={handleSwitchSection} onMouseEnter={handleOnHover} onMouseLeave={handleOffHover} className={clsx(
          'flex-1 flex items-center justify-center py-3',
          'desktop:flex-none desktop:justify-end desktop:pr-8 desktop:py-4 desktop:border-r-4',
          'transition-colors duration-700 ease-in-out',
          selected === 'portfolio' ? activeClr : inactiveClr,
        )}>
          {itemHovered === 'portfolio' ? t('menu.portfolio') : (
            <span className="flex flex-col items-center gap-1 desktop:contents">
              <CabinetIcon className='sm:size-[32px] size-[24px]' />
              <span className={clsx('desktop:hidden w-1 h-1 rounded-full transition-all duration-300', selected === 'portfolio' ? 'opacity-100 bg-current' : 'opacity-0')} />
            </span>
          )}
        </li>
        <li id='contacts' onClick={handleSwitchSection} onMouseEnter={handleOnHover} onMouseLeave={handleOffHover} className={clsx(
          'flex-1 flex items-center justify-center py-3',
          'desktop:flex-none desktop:justify-end desktop:pr-8 desktop:py-4 desktop:border-r-4',
          'transition-colors duration-700 ease-in-out',
          selected === 'contacts' ? activeClr : inactiveClr,
        )}>
          {itemHovered === 'contacts' ? t('menu.contacts') : (
            <span className="flex flex-col items-center gap-1 desktop:contents">
              <AtSign className='sm:size-[32px] size-[24px]' />
              <span className={clsx('desktop:hidden w-1 h-1 rounded-full transition-all duration-300', selected === 'contacts' ? 'opacity-100 bg-current' : 'opacity-0')} />
            </span>
          )}
        </li>
      </ul>
    </div>
    </>
  )
}
