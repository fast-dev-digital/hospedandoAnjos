// Elementos decorativos da marca, em linha dourada (ver referência da identidade).
// Todos herdam a cor via `currentColor` para facilitar o uso com text-gold etc.

type SvgProps = React.SVGProps<SVGSVGElement>;

/** Par de asas de anjo (linha). Use width para escalar. */
export function AngelWings({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 240 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* asa esquerda */}
      <path d="M118 40C96 30 70 24 40 26c20 6 34 14 44 24M118 46C92 44 64 46 30 60c26-4 48-2 66 6M118 52C96 56 74 64 52 78c22-10 44-14 62-12" />
      {/* asa direita (espelhada) */}
      <path d="M122 40c22-10 48-16 78-14-20 6-34 14-44 24M122 46c26-2 54 0 88 14-26-4-48-2-66 6M122 52c22 4 44 12 66 26-22-10-44-14-62-12" />
    </svg>
  );
}

/** Auréola fina. */
export function Halo({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 30"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      className={className}
      {...props}
    >
      <ellipse cx="60" cy="15" rx="50" ry="10" />
    </svg>
  );
}

/** Coraçãozinho preenchido (acento). */
export function Heart({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M12 21s-7.5-4.9-10-9.5C.3 8.2 1.8 4.5 5.2 4.5c2 0 3.4 1.2 4.3 2.6.4.6 1.6.6 2 0 .9-1.4 2.3-2.6 4.3-2.6 3.4 0 4.9 3.7 3.2 7C19.5 16.1 12 21 12 21z" />
    </svg>
  );
}

/** Nota musical (acento). */
export function MusicNote({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M9 17.5a2.5 2.5 0 1 1-2.5-2.5c.5 0 1 .1 1.5.4V5l9-2v9.5a2.5 2.5 0 1 1-2.5-2.5c.5 0 1 .1 1.5.4V5.8L9 7.3v10.2z" />
    </svg>
  );
}
