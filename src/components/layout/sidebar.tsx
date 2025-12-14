import { clsx } from 'clsx';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { setUserLocale } from '@/lib/locale';

export default function Sidebar() {
  const locale = useLocale();
  const t = useTranslations('main');

  const startTransition = useTransition()[1];
  const switchLang = () => {
    startTransition(() => {
      setUserLocale(locale === 'en' ? 'it' : 'en');
    });
  };

  return (
    <div className="lg:block hidden fixed right-0 inset-y-1/2 mr-8 mt-8 text-base font-semibold">
      <ul className='list-none -translate-y-1/2 text-right cursor-pointer'>
        <li onClick={switchLang} id='langBtn' className={clsx('border-r-4 pr-8 py-4 text-grey border-grey',
          {
            'text-primary border-primary transition delay-150 duration-300 ease-in-out my-[2px] hover:scale-110': true
          },
        )}>
          lang btn
        </li>
        <li id='1' className={clsx('border-r-4 pr-8 py-4 text-grey border-grey',
          {
            'text-white border-white transition delay-150 duration-300 ease-in-out my-[2px] hover:scale-110': false
          },
        )}>
          01
        </li>
        <li id='2' className={clsx('border-r-4 pr-8 py-4 text-grey border-grey',
          {
            'text-white border-white transition delay-150 duration-300 ease-in-out my-[2px] hover:scale-110': false
          },
        )}>
          02
        </li>

      </ul>
    </div>
  )
}
