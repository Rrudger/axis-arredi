'use client'

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import Sidebar from '@/components/layout/sidebar';
import MainScreen from '@/components/mainscreen';
import MainScreenAlt from '@/components/mainscreenalt';
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

   useEffect(() => {
      if (!mainRef.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            switchSection('home')
          }
        },
        {
          threshold: 0.3,
        }
      );
      observer.observe(mainRef.current);
      return () => observer.disconnect();
    }, []);
   useEffect(() => {
      if (!projectsRef.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            switchSection('projects')
          }
        },
        {
          threshold: 0.3,
        }
      );
      observer.observe(projectsRef.current);
      return () => observer.disconnect();
    }, []);
    useEffect(() => {
       if (!screen3Ref.current) return;
       const observer = new IntersectionObserver(
         ([entry]) => {
           if (entry.isIntersecting) {
             switchSection('portfolio')
           }
         },
         {
           threshold: 0.3,
         }
       );
       observer.observe(screen3Ref.current);
       return () => observer.disconnect();
     }, []);
    useEffect(() => {
       if (!contactsRef.current) return;
       const observer = new IntersectionObserver(
         ([entry]) => {
           if (entry.isIntersecting) {
             switchSection('contacts')
           }
         },
         {
           threshold: 0.3,
         }
       );
       observer.observe(contactsRef.current);
       return () => observer.disconnect();
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
