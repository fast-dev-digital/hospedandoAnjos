import type { DonationType } from '@shared/checkout-contract';

// Mínimos definidos no CONTEXT.md (em centavos). O backend SEMPRE revalida —
// aqui é só para UX (desabilitar botão, mostrar aviso).
export const MIN_CENTS: Record<DonationType, number> = {
  avulsa: 100, // R$ 1,00
  recorrente: 2000, // R$ 20,00
};

// Âncoras de valor sugeridas (em centavos). Clicar preenche o campo; o doador
// pode sobrescrever — âncora e valor livre são o MESMO campo.
export const ANCHORS_CENTS: number[] = [2000, 5000, 10000, 20000];

/** Formata centavos como BRL (ex.: 2000 -> "R$ 20,00"). */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Converte um texto digitado ("20", "20,50", "R$ 20") em centavos. */
export function parseToCents(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '');
  const normalized = cleaned.replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.round(value * 100);
}

/** Valida o valor para o tipo escolhido (espelha a regra do backend). */
export function isValidAmount(type: DonationType, cents: number): boolean {
  return Number.isInteger(cents) && cents >= MIN_CENTS[type];
}
