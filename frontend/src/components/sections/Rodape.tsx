import { BrandLockup } from '@/components/brand/BrandLockup';

export function Rodape() {
  return (
    <footer className="bg-navy text-cream">
      {/* faixa prisma — assinatura da marca */}
      <div className="prism-rule h-1.5 w-full" />

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:grid-cols-3">
        <div>
          <BrandLockup className="text-cream" />
          <p className="mt-4 max-w-xs text-sm text-cream/70">
            Anunciando esperança pela música e o amor de Deus. Hortolândia/SP.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-gold-soft">
            Links
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-cream/80">
            <li><a href="#programa" className="hover:text-cream">O programa</a></li>
            <li><a href="#doar" className="hover:text-cream">Doar</a></li>
            <li><a href="#faq" className="hover:text-cream">Dúvidas</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-gold-soft">
            Contato
          </h4>
          {/* PLACEHOLDER — dados oficiais a confirmar com o cliente */}
          <ul className="mt-3 space-y-2 text-sm text-cream/80">
            <li>contato@prismabrasil.com.br</li>
            <li>@prismabrasil</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-cream/60">
        © {new Date().getFullYear()} Associação Prisma Brasil · Pagamentos
        processados com segurança pela Stripe
      </div>
    </footer>
  );
}
