import { useState } from 'react';

// PLACEHOLDER fiel à identidade — perguntas/respostas reais virão do cliente.
const FAQ = [
  {
    q: 'Para onde vai a minha doação?',
    a: 'Para o sustento do ministério de música do Prisma Brasil: turnês, gravações, equipe e a obra de evangelização pela música.',
  },
  {
    q: 'Posso cancelar a doação mensal?',
    a: 'Sim, a qualquer momento e sem burocracia. Você recebe um link para gerenciar ou cancelar sua contribuição.',
  },
  {
    q: 'O pagamento é seguro?',
    a: 'Sim. Todo o pagamento é processado pela Stripe, líder mundial em pagamentos. Não armazenamos dados do seu cartão.',
  },
  {
    q: 'Quais formas de pagamento posso usar?',
    a: 'Doação mensal: cartão de crédito. Doação única: cartão ou PIX.',
  },
  {
    q: 'Vou receber um recibo?',
    a: 'Sim. Após a confirmação, enviamos o agradecimento e o recibo pelos nossos canais oficiais.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="px-5 py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center font-display text-3xl font-bold text-navy sm:text-4xl">
          Perguntas frequentes
        </h2>

        <div className="mt-10 divide-y divide-gold/25 overflow-hidden rounded-2xl border border-gold/25 bg-cream-deep/30">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-bold text-navy">{item.q}</span>
                  <span
                    className={`shrink-0 text-2xl font-light text-gold transition-transform ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-ink-soft">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
