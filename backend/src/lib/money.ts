// =============================================================================
// lib/money.ts — lógica PURA de valor. Sem dependência externa. Testável.
// =============================================================================
// CONTEXT.md: avulsa >= 100 centavos; recorrente >= 2000 centavos. Sem teto (ainda).
// Nunca confiar no valor cru do browser -> validar aqui.
//
// PSEUDOCÓDIGO / GUIA:
//
//   const MIN_AVULSA = 100;       // R$1,00
//   const MIN_RECORRENTE = 2000;  // R$20,00
//
//   export function validateAmount(type, amountInCents): { ok, error? }
//     - se não for inteiro > 0 -> erro "valor inválido"
//     - se type=avulsa     e amount < MIN_AVULSA     -> erro
//     - se type=recorrente e amount < MIN_RECORRENTE -> erro
//     - senão ok:true
//
//   (opcional) formatBRL(cents) p/ logs/recibo -> "R$ 20,00"
// =============================================================================

import type { DonationType } from '../../../shared/checkout-contract.js';
import type { Result } from './result.js';

const MIN_AVULSA = 100; // R$1,00
const MIN_RECORRENTE = 2000; // R$20,00

// NOTA: a conversão reais->centavos é feita no FRONTEND (parseToCents). O backend
// recebe o valor já em centavos e aqui só revalida o mínimo (nunca confiar no browser).
export function validateAmount(
    type: DonationType,
    amountInCents: number,
): Result {
    // valor precisa ser inteiro positivo (nosso payload interno é em centavos).
    // Number.isInteger já barra NaN, fração e infinito de uma vez.
    if (amountInCents <= 0 || !Number.isInteger(amountInCents)) {
        return { ok: false, error: "Valor inválido" };
    }

    if (type === "avulsa") {
        if (amountInCents < MIN_AVULSA) {
            return { ok: false, error: "Valor abaixo do mínimo para doação avulsa" };
        }
        return { ok: true };
    }

    if (type === "recorrente") {
        if (amountInCents < MIN_RECORRENTE) {
            return { ok: false, error: "Valor abaixo do mínimo para doação recorrente" };
        }
        return { ok: true };
    }

    // tipo fora de avulsa|recorrente — não tratar como válido.
    return { ok: false, error: "Tipo de doação inválido" };
}
