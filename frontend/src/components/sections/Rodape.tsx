import logoPrisma from '@/assets/logo-prisma.webp';
import {
  CONTATO,
  CONTATO_EMAIL_HREF,
  CONTATO_WHATSAPP_HREF,
} from '@/lib/contato';

export function Rodape() {
  return (
    <footer className="bg-navy text-cream">
      {/* faixa prisma — assinatura da marca */}
      <div className="prism-rule h-1.5 w-full" />

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:grid-cols-3">
        <div>
          <span className="inline-flex rounded-xl bg-cream px-4 py-3 shadow-warm">
            <img
              src={logoPrisma}
              alt="Associação Prisma Brasil"
              className="h-10 w-auto"
            />
          </span>
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
          {/* Canais oficiais (lib/contato.ts). WhatsApp: confirmar o número real. */}
          <ul className="mt-3 space-y-2 text-sm text-cream/80">
            <li>
              <a href={CONTATO_EMAIL_HREF} className="hover:text-cream">
                {CONTATO.email}
              </a>
            </li>
            <li>
              <a
                href={CONTATO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cream"
              >
                {CONTATO.instagram}
              </a>
            </li>
            <li>
              <a
                href={CONTATO_WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cream"
              >
                WhatsApp {CONTATO.whatsappLabel}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-white/10 px-5 py-5 text-center text-xs text-cream/60 sm:flex-row sm:justify-between">
        <span>
          © {new Date().getFullYear()} Associação Prisma Brasil · Pagamentos
          processados com segurança pela Asaas
        </span>
        <span>
          Desenvolvido por{' '}
          <span className="font-semibold text-gold-soft">Fast Development</span>
        </span>
      </div>
    </footer>
  );
}
