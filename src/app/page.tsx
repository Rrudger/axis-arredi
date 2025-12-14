'use client'

import { useEffect, useState } from 'react';
import {useTranslations} from 'next-intl';

import Sidebar from '@/components/layout/sidebar';

export default function Home() {
   const t = useTranslations('main');

  return (
    <div className='static'>
      <Sidebar />
      {t('title')}
    </div>
  );
}
