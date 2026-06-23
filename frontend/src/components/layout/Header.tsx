import logoPrisma from '@/assets/logo-prisma.webp';

const NAV = [
  { href: '#programa', label: 'O programa' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#faq', label: 'Dúvidas' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#topo" className="flex items-center" aria-label="Início">
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
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-cream shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy-soft"
        >
          Quero hospedar anjos
        </a>
      </div>
    </header>
  );
}
