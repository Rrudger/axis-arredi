'use client'

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import Sidebar from '@/components/layout/sidebar';
import MainScreenAlt2 from '@/components/mainscreenalt2';
import Projects from '@/components/services';
import ProjectsScreen from '@/components/projects';
import Contacts from '@/components/contacts';

export default function Home() {
   const t = useTranslations('main');

   const [selectedSection, switchSection] = useState<'home' | 'projects' | 'portfolio' | 'contacts'>('home');

   const projectsRef = useRef<HTMLDivElement | null>(null);
   const screen3Ref = useRef<HTMLDivElement | null>(null);
   const contactsRef = useRef<HTMLDivElement | null>(null);
   const mainRef = useRef<HTMLDivElement | null>(null);

   // Один наблюдатель на все секции: какая видна на 30% — та и активна в меню.
   useEffect(() => {
      const sections = [
        [mainRef, 'home'],
        [projectsRef, 'projects'],
        [screen3Ref, 'portfolio'],
        [contactsRef, 'contacts'],
      ] as const;
      const observers = sections.flatMap(([ref, section]) => {
        if (!ref.current) return [];
        const observer = new IntersectionObserver(
          ([entry]) => { if (entry.isIntersecting) switchSection(section); },
          { threshold: 0.3 },
        );
        observer.observe(ref.current);
        return [observer];
      });
      return () => observers.forEach(o => o.disconnect());
    }, []);

  return (
    <div className='static'>
      <Sidebar selected={selectedSection} switchSection={switchSection} />
      <MainScreenAlt2 ref={mainRef} />
      <Projects ref={projectsRef} />
      <ProjectsScreen ref={screen3Ref} />
      <Contacts ref={contactsRef} />
    </div>
  );
}
