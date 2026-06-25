import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const MainScreen = forwardRef<HTMLDivElement>((props, ref) => {
  const t = useTranslations('main');

  return (
     <div id='homeSection' ref={ref} className='h-screen'>

       <div className="absolute inset-0 grid grid-cols-12">
         <div className='col-span-4 h-screen bg-ground'></div>
         <div className='col-span-8 h-screen bg-ground2'></div>
       </div>

       <div className="relative h-screen grid grid-cols-12">

         <div className='col-span-4 h-screen flex justify-end items-start py-8'>
           <div className='w-full h-1/2 flex justify-end items-end'>
             <div className='w-full h-3/4 bg-secondary'>left</div>
           </div>
         </div>

         <div className='col-span-8 h-screen flex justify-start items-end py-8'>
           <div className='w-full h-1/2 bg-primarySpare'>right</div>
         </div>

       </div>

     </div>
   )
});

export default MainScreen;
