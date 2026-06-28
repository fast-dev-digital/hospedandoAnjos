// =============================================================================
// lib/phone.ts — normalização/validação de WhatsApp em E.164. PURO. Testável.
// =============================================================================
// CONTEXT.md: WhatsApp obrigatório, GLOBAL em E.164 com código de país
// obrigatório (+5511..., +1..., +351...). SEM default +55. Crítico: Manychat
// depende do número. Se não normalizar p/ E.164 válido -> rejeita o checkout.
//
// PSEUDOCÓDIGO / GUIA:
//
//   export function normalizeE164(raw): { ok:true, value } | { ok:false, error }
//     - trim, remover espaços/()-/.
//     - exigir que comece com '+' (código de país obrigatório, sem assumir +55)
//     - manter só dígitos após o '+'
//     - validar formato E.164: ^\+[1-9]\d{7,14}$
//     - sucesso -> value = '+' + dígitos ; falha -> error
//
//   Recomendado usar libphonenumber-js para robustez em vez de regex caseira.
// =============================================================================
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { Result } from './result.js';

export function normalizeE164(raw: string): Result<string> {
  // sem país default de propósito: número sem '+código' vira undefined.
  // É assim que aplicamos "código de país obrigatório, sem assumir +55".
  const phone = parsePhoneNumberFromString(raw);
  if (!phone) {
    return { ok: false, error: "Número de WhatsApp inválido: informe o código de país" };
  }

  if (!phone.isValid()) {
    return { ok: false, error: "Número de WhatsApp inválido" };
  }

  return { ok: true, value: phone.number }; // E.164 formatado pela lib
}

// O Asaas (gateway BR) preenche o campo de telefone na página hospedada a partir
// do número NACIONAL (DDD + número), sem o código de país. Mandar o E.164 com
// '+55' faz o Asaas não reconhecer/preencher. Este helper extrai o número
// nacional do E.164 que guardamos. Ex.: '+5511999998888' -> '11999998888'.
// Para números não-BR não há equivalente perfeito no Asaas; devolvemos o nacional
// como melhor esforço (o E.164 completo segue no Brevo, que o Manychat usa).
export function toAsaasMobilePhone(e164: string): string {
  const phone = parsePhoneNumberFromString(e164);
  if (!phone) return e164.replace(/\D/g, '');
  return phone.nationalNumber;
}