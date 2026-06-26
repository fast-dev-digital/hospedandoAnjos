// PLACEHOLDER fiel à identidade — copy de transparência a revisar com o cliente.
const PASSOS = [
  {
    n: '01',
    titulo: 'Você escolhe o valor',
    texto: 'Mensal (recorrente) ou única (avulsa). A partir de R$ 20/mês.',
  },
  {
    n: '02',
    titulo: 'Pagamento seguro',
    texto: 'Concluído no ambiente da Asaas — cartão ou PIX. Não guardamos dados do cartão.',
  },
  {
    n: '03',
    titulo: 'Confirmação na hora',
    texto: 'Você recebe o agradecimento e o recibo pelos nossos canais oficiais.',
  },
  {
    n: '04',
    titulo: 'Cancele quando quiser',
    texto: 'A doação recorrente é cancelável a qualquer momento, sem burocracia.',
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="bg-navy px-5 py-20 text-cream">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Simples, seguro e transparente
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-cream/80">
          Da intenção à confirmação em poucos passos.
        </p>
      </div>

      <ol className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PASSOS.map((p) => (
          <li
            key={p.n}
            className="rounded-2xl border border-gold/30 bg-white/5 p-6"
          >
            <span className="font-display text-3xl font-bold text-gold-soft">
              {p.n}
            </span>
            <h3 className="mt-3 text-lg font-bold">{p.titulo}</h3>
            <p className="mt-1.5 text-sm text-cream/75">{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
