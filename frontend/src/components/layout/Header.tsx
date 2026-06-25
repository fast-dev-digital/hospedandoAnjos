import { useState } from 'react';
import logoPrisma from '@/assets/logo-prisma.webp';

const NAV = [
  { href: '#programa', label: 'O programa' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#faq', label: 'Dúvidas' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a
          href="#topo"
          className="flex items-center"
          aria-label="Início"
          onClick={() => setOpen(false)}
        >
          <img
            src={logoPrisma}
            alt="Associação Prisma Brasil"
            className="h-10 w-auto sm:h-11"
          />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-ink/80 transition-colors hover:text-navy"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#doar"
          className="hidden rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-cream shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy-soft md:inline-block"
        >
          Quero hospedar anjos
        </a>

        {/* Botão hambúrguer — só no mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-cream-deep/60 md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Menu mobile — links + CTA, fecha ao escolher */}
      {open && (
        <nav
          id="menu-mobile"
          className="border-t border-gold/20 bg-cream/95 px-5 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base font-semibold text-ink/80 transition-colors hover:bg-cream-deep/60 hover:text-navy"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#doar"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-full bg-navy px-5 py-3 text-center text-sm font-bold text-cream shadow-warm transition-colors hover:bg-navy-soft"
          >
            Quero hospedar anjos
          </a>
        </nav>
      )}
    </header>
  );
}
