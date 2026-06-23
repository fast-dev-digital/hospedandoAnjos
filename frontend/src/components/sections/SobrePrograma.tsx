import { MusicNote } from '@/components/brand/Decor';

// PLACEHOLDER fiel à identidade — textos reais virão do cliente (ver pendências).
const PILARES = [
  {
    titulo: 'Música que evangeliza',
    texto:
      'Cada doação sustenta turnês, gravações e os bastidores do ministério de louvor do Prisma Brasil.',
  },
  {
    titulo: 'Esperança que alcança',
    texto:
      'Levamos a mensagem do evangelho através da música a milhares de vidas, dentro e fora das igrejas.',
  },
  {
    titulo: 'Legado que permanece',
    texto:
      'Doadores recorrentes tornam o trabalho previsível e fazem o ministério crescer ao longo do tempo.',
  },
];

export function SobrePrograma() {
  return (
    <section id="programa" className="relative px-5 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <MusicNote className="mx-auto mb-4 w-7 text-gold" />
        <h2 className="font-display text-3xl font-bold text-navy sm:text-4xl">
          O que é o <span className="font-script text-4xl sm:text-5xl">Hospedando Anjos</span>?
        </h2>
        <div className="mx-auto mt-5 max-w-2xl space-y-4 text-lg leading-relaxed text-ink">
          <p>
            Hospedando Anjos é o programa de doação do{' '}
            <strong className="font-bold text-navy">Prisma Brasil</strong>, criado
            para transformar contribuições em apoio contínuo à missão do
            ministério.
          </p>
          <p>
            Por meio desse projeto, cada doação coopera com a proclamação do
            evangelho realizada pelo Prisma, ajudando o grupo a anunciar esperança
            pela música e a alcançar pessoas para Cristo. Essas vidas alcançadas —
            tocadas pela mensagem, despertadas para a fé e conduzidas no caminho da
            salvação — são os{' '}
            <strong className="font-bold text-navy">
              anjos que o doador ajuda a hospedar
            </strong>
            .
          </p>
          <p>
            Assim, ao apoiar o Prisma, o doador não apenas mantém um ministério,
            mas participa ativamente da missão de acolher e conduzir vidas rumo ao
            Céu.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
        {PILARES.map((p) => (
          <article
            key={p.titulo}
            className="rounded-2xl border border-gold/25 bg-cream-deep/40 p-6 text-center"
          >
            <h3 className="font-display text-xl font-bold text-navy">
              {p.titulo}
            </h3>
            <p className="mt-2 text-ink-soft">{p.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
