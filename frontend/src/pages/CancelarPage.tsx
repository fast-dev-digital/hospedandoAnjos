import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AngelWings, Halo, Heart } from '@/components/brand/Decor';
import { cancelDonation, type CancelResult } from '@/lib/cancel';
import logoPrisma from '@/assets/logo-prisma.webp';

// Página "burra" de cancelamento (ADR-0005 #3). O link assinado vem do e-mail
// ({{LINK_CANCELAMENTO}} do Brevo) no formato …/cancelar?t=<token>. Ao montar,
// dispara a chamada e mostra o resultado — 1 clique cancela, sem confirmação.
// Não recebe nem exibe dados do doador (o token só permite cancelar, não consultar).
type Status = 'loading' | CancelResult['status'];

export function CancelarPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    // dispara uma única vez no mount (1 clique = 1 cancelamento; sem botão "confirmar").
    let active = true;
    const token = params.get('t') ?? '';
    cancelDonation(token).then((result) => {
      if (!active) return;
      setStatus(result.status);
      setMessage(result.message);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Topo enxuto: só a marca (leva à landing). */}
      <header className="border-b border-gold/20 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center" aria-label="Início">
            <img
              src={logoPrisma}
              alt="Associação Prisma Brasil"
              className="h-10 w-auto sm:h-11"
            />
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

        <div className="mx-auto w-full max-w-xl" aria-live="polite">
          {status === 'loading' && <LoadingState />}
          {status === 'success' && <SuccessState message={message} />}
          {status === 'invalid' && <InvalidState message={message} />}
          {status === 'error' && <ErrorState />}
        </div>
      </main>

      {/* assinatura prisma da marca */}
      <div className="prism-rule h-1.5 w-full" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center">
      <span
        aria-hidden
        className="h-12 w-12 animate-spin rounded-full border-4 border-gold/30 border-t-navy"
      />
      <p className="mt-6 text-lg font-semibold text-navy">
        Cancelando sua doação…
      </p>
      <p className="mt-1 text-sm text-ink-soft">Um instante, por favor.</p>
    </div>
  );
}

function SuccessState({ message }: { message?: string }) {
  return (
    <>
      <AngelWings className="mx-auto w-56 text-gold sm:w-72" />
      <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-cream-deep/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-navy">
        <Heart className="w-3.5 text-gold" />
        Doação cancelada
      </span>
      <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-navy sm:text-5xl">
        Cancelamento confirmado
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink">
        {message ??
          'Sua doação recorrente foi cancelada. Obrigado por ter apoiado o Hospedando Anjos. 💛'}
      </p>

      <div className="mx-auto mt-6 flex items-center justify-center gap-3">
        <span className="prism-rule h-[3px] w-16 rounded-full" />
        <Heart className="w-4 text-gold" />
        <span className="prism-rule h-[3px] w-16 rounded-full" />
      </div>

      <BackButton />
    </>
  );
}

function InvalidState({ message }: { message?: string }) {
  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-tight text-navy sm:text-5xl">
        Link inválido ou expirado
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink">
        {message ??
          'Este link de cancelamento é inválido ou expirou. Verifique se abriu o link mais recente do seu e-mail.'}
      </p>
      <BackButton />
    </>
  );
}

function ErrorState() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-tight text-navy sm:text-5xl">
        Algo deu errado
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink">
        Não foi possível cancelar agora. Tente novamente mais tarde ou fale
        conosco.
      </p>
      <BackButton />
    </>
  );
}

function BackButton() {
  return (
    <Link
      to="/"
      className="mt-10 inline-flex items-center gap-2 rounded-full bg-navy px-8 py-4 font-bold text-cream shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy-soft"
    >
      <Halo className="w-6 text-gold-soft" />
      Voltar ao site
    </Link>
  );
}
