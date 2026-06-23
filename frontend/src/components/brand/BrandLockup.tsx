// Lockup textual da marca: "ASSOCIAÇÃO / PRISMA / BRASIL".
// Placeholder fiel até recebermos o logo vetor oficial do cliente.

type Props = { className?: string };

export function BrandLockup({ className = '' }: Props) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.45em] text-current/70">
        Associação
      </span>
      <span className="font-caps text-lg font-bold uppercase tracking-[0.18em]">
        Prisma
      </span>
      <span className="prism-rule mt-0.5 h-[3px] w-full rounded-full" />
    </span>
  );
}
