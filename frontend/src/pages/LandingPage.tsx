import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/sections/Hero';
import { SobrePrograma } from '@/components/sections/SobrePrograma';
import { BlocoDoacao } from '@/components/sections/BlocoDoacao';
import { ComoFunciona } from '@/components/sections/ComoFunciona';
import { Faq } from '@/components/sections/Faq';
import { Rodape } from '@/components/sections/Rodape';

export function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SobrePrograma />
        <BlocoDoacao />
        <ComoFunciona />
        <Faq />
      </main>
      <Rodape />
    </>
  );
}
