import { Link } from 'react-router-dom';
import { AngelWings, Heart } from '@/components/brand/Decor';

// Rota dedicada de pós-pagamento (destino da success_url da Stripe).
// SEM efeito colateral: o cadastro no Brevo acontece via webhook no backend.
// Conteúdo é placeholder — copy final a alinhar com o usuário/cliente.
export function ObrigadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(216,192,129,0.5), transparent 65%)',
        }}
      />
      <AngelWings className="w-60 text-gold sm:w-72" />
      <Heart className="mt-4 w-8 text-gold" />

      <h1 className="mt-6 font-display text-4xl font-bold text-navy sm:text-5xl">
        Obrigado por ser um <span className="font-script text-5xl sm:text-6xl">anjo</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink">
        Sua doação ajuda a anunciar esperança pela música e o amor de Deus. Em
        instantes você receberá a confirmação pelos nossos canais.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <span className="prism-rule h-[3px] w-16 rounded-full" />
        <Heart className="w-4 text-gold" />
        <span className="prism-rule h-[3px] w-16 rounded-full" />
      </div>

      <Link
        to="/"
        className="mt-10 rounded-full bg-navy px-8 py-4 font-bold text-cream shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy-soft"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
