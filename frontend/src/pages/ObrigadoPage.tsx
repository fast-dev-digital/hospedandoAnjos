import { Link } from 'react-router-dom';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { AngelWings, Halo, Heart, MusicNote } from '@/components/brand/Decor';

// Rota dedicada de pós-pagamento (destino da success_url da Stripe).
// SEM efeito colateral: o cadastro no Brevo/Stripe acontece via webhook no backend.
// Aqui só celebramos a doação e orientamos os próximos passos.
export function ObrigadoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Topo enxuto: só a marca (leva à landing). Sem nav de âncoras, que
          não existiriam nesta rota. */}
      <header className="border-b border-gold/20 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center gap-2" aria-label="Início">
            <BrandLockup className="text-navy" />
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16 text-center sm:py-20">
        {/* brilho quente atrás do conteúdo */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(216,192,129,0.5), transparent 65%)',
          }}
        />
        {/* notas musicais esparsas, como no Hero */}
        <MusicNote
          aria-hidden
          className="absolute left-[12%] top-24 hidden w-8 -rotate-12 text-gold/40 sm:block"
        />
        <MusicNote
          aria-hidden
          className="absolute right-[14%] top-36 hidden w-6 rotate-12 text-gold/30 sm:block"
        />

        <div className="mx-auto w-full max-w-xl">
          <AngelWings className="mx-auto w-56 text-gold sm:w-72" />

          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-cream-deep/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-navy">
            <Heart className="w-3.5 text-gold" />
            Doação confirmada
          </span>

          <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-navy sm:text-5xl">
            Obrigado por hospedar{' '}
            <span className="font-script text-5xl sm:text-6xl">anjos</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink">
            Sua doação foi recebida com gratidão. Com ela, você ajuda o{' '}
            <strong className="font-bold text-navy">Prisma Brasil</strong> a
            alcançar vidas para Cristo pela{' '}
            <strong className="font-bold text-navy">música</strong> e o{' '}
            <strong className="font-bold text-navy">amor de Deus</strong> — os
            anjos que você ajuda a hospedar.
          </p>

          <div className="mx-auto mt-6 flex items-center justify-center gap-3">
            <span className="prism-rule h-[3px] w-16 rounded-full" />
            <Heart className="w-4 text-gold" />
            <span className="prism-rule h-[3px] w-16 rounded-full" />
          </div>

          {/* O que acontece agora */}
          <div className="mt-8 rounded-3xl border border-gold/30 bg-cream-deep/60 p-6 text-left shadow-warm sm:p-7">
            <h2 className="text-center font-display text-xl font-bold text-navy">
              O que acontece agora
            </h2>
            <ul className="mt-5 space-y-4">
              <Step icon={<Heart className="w-4 text-gold" />}>
                Você receberá a{' '}
                <strong className="font-semibold text-navy">
                  confirmação por e-mail
                </strong>{' '}
                com o recibo da sua doação em instantes.
              </Step>
              <Step icon={<Halo className="w-6 text-gold" />}>
                Doação recorrente? Ela é renovada automaticamente todo mês —{' '}
                <strong className="font-semibold text-navy">
                  você pode cancelar quando quiser
                </strong>
                .
              </Step>
              <Step icon={<MusicNote className="w-4 text-gold" />}>
                Em breve entraremos em contato pelos nossos canais para você
                acompanhar de perto o impacto do programa.
              </Step>
            </ul>
          </div>

          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-navy px-8 py-4 font-bold text-cream shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy-soft"
          >
            <Halo className="w-6 text-gold-soft" />
            Voltar ao início
          </Link>

          <p className="mt-5 text-sm text-ink-soft">
            Pagamento processado com segurança pela Stripe.
          </p>
        </div>
      </main>

      {/* assinatura prisma da marca */}
      <div className="prism-rule h-1.5 w-full" />
    </div>
  );
}

function Step({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream">
        {icon}
      </span>
      <span className="text-sm leading-relaxed text-ink">{children}</span>
    </li>
  );
}
