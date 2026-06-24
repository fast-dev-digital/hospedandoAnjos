// =============================================================================
// lib/validation.ts — validação do payload de checkout. PURO. Testável.
// =============================================================================
// Combina money + phone + checagens de e-mail/nome para validar CheckoutRequest.
//
// PSEUDOCÓDIGO / GUIA:
//
//   import { validateAmount } from './money';
//   import { normalizeE164 } from './phone';
//
//   export function validateCheckout(body): { ok:true, value } | { ok:false, errors }
//     - type ∈ {'avulsa','recorrente'}        senão erro
//     - name não vazio (trim)                 senão erro
//     - email casa regex simples de e-mail    senão erro
//     - validateAmount(type, amountInCents)   propaga erro
//     - normalizeE164(whatsapp)               propaga erro; usa value normalizado
//     - retorna value já SANITIZADO (whatsapp em E.164, strings trimadas)
// =============================================================================
import {validateAmount } from './money.js';
import {normalizeE164} from './phone.js';
import type { CheckoutRequest } from '../../../shared/checkout-contract.js';
import type { MultiResult} from './result.js';

// regex simples de e-mail: algo@algo.algo (validação de verdade é o envio)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// lê um campo como string trimada (ou '' se não for string)
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function validateCheckout(body: unknown): MultiResult<CheckoutRequest> {
  const errors: string[] = [];

  // body vem como `unknown` (payload cru do browser). Antes de acessar campos,
  // estreitar para "objeto com chaves string". Se nem isso for -> aborta cedo.
  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: ['Payload inválido'] };
  }
  const b = body as Record<string, unknown>;

  const type = b.type;
  const name = str(b.name);
  const email = str(b.email);
  const amountInCents = b.amountInCents;

  const typeOk = type === 'avulsa' || type === 'recorrente';
  if (!typeOk) errors.push('Tipo de doação inválido');
  if (name.length === 0) errors.push('Nome é obrigatório');
  if (!EMAIL_RE.test(email)) errors.push('E-mail inválido');

  // o front já envia o valor em centavos (parseToCents). Aqui só revalidamos o
  // mínimo — nunca confiar no browser. A conversão reais->centavos é do front.
  if (typeof amountInCents !== 'number') {
    errors.push('Valor inválido');
  } else if (typeOk) {
    const r = validateAmount(type, amountInCents);
    if (!r.ok) errors.push(r.error);
  }

  // whatsapp: normaliza e guarda o E.164 p/ o payload sanitizado
  let whatsappE164 = '';
  if (typeof b.whatsapp !== 'string') {
    errors.push('WhatsApp é obrigatório');
  } else {
    const r = normalizeE164(b.whatsapp);
    if (!r.ok) errors.push(r.error);
    else whatsappE164 = r.value;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // tudo válido -> devolve payload SANITIZADO (valor em centavos, whatsapp em
  // E.164, strings trimadas)
  return {
    ok: true,
    value: {
      type: type as CheckoutRequest['type'],
      amountInCents: amountInCents as number,
      name,
      email,
      whatsapp: whatsappE164,
    },
  };
}