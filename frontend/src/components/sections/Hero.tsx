import { AngelWings, Halo, Heart, MusicNote } from '@/components/brand/Decor';

export function Hero() {
  return (
    <section
      id="topo"
      className="relative overflow-hidden px-5 pb-20 pt-16 sm:pt-24"
    >
      {/* brilho quente atrás do título */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(216,192,129,0.45), transparent 65%)',
        }}
      />
      {/* notas musicais esparsas */}
      <MusicNote
        aria-hidden
        className="absolute left-[12%] top-32 hidden w-8 -rotate-12 text-gold/40 sm:block"
      />
      <MusicNote
        aria-hidden
        className="absolute right-[14%] top-44 hidden w-6 rotate-12 text-gold/30 sm:block"
      />

      <div className="mx-auto max-w-3xl text-center">
        <AngelWings className="mx-auto mb-2 w-56 text-gold sm:w-72" />

        <h1>
          <span className="block font-display text-3xl font-semibold uppercase tracking-[0.12em] text-navy sm:text-4xl">
            Hospedando
          </span>
          <span className="-mt-2 block font-script text-7xl text-navy sm:text-8xl">
            anjos
          </span>
        </h1>

        <div className="mx-auto mt-3 flex items-center justify-center gap-3">
          <span className="prism-rule h-[3px] w-16 rounded-full" />
          <Heart className="w-4 text-gold" />
          <span className="prism-rule h-[3px] w-16 rounded-full" />
        </div>

        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink sm:text-xl">
          Ao doar, você ajuda o{' '}
          <strong className="font-bold text-navy">Prisma Brasil</strong> a{' '}
          <strong className="font-bold text-navy">hospedar anjos</strong>: vidas
          alcançadas para Cristo pela{' '}
          <strong className="font-bold text-navy">música</strong> e o{' '}
          <strong className="font-bold text-navy">amor de Deus</strong>.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#doar"
            className="group inline-flex items-center gap-2 rounded-full bg-navy px-8 py-4 text-base font-bold text-cream shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy-soft"
          >
            <Halo className="w-6 text-gold-soft transition-transform group-hover:-translate-y-0.5" />
            Quero hospedar anjos
          </a>
          <a
            href="#programa"
            className="text-sm font-semibold text-ink/70 underline-offset-4 transition-colors hover:text-navy hover:underline"
          >
            Conhecer o programa primeiro
          </a>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          Doação recorrente a partir de{' '}
          <span className="font-bold text-navy">R$ 20/mês</span> · cancele quando
          quiser
        </p>
      </div>
    </section>
  );
}
