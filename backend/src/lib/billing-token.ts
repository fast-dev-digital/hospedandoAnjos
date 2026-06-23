// =============================================================================
// lib/billing-token.ts — token assinado (HMAC) que identifica o doador no link
// de cancelamento. Quase puro: só depende do segredo do env e do crypto nativo.
// =============================================================================
// Por que existe: o link de cancelamento vai no e-mail e chama a API direto. O
// token prova QUEM é o doador (cus_xxx) sem login. Como é assinado com um segredo
// que só o backend tem, ninguém forja/troca o customerId p/ abrir portal alheio.
//
// Sem validade: o link vale enquanto a pessoa for doadora (o cus_xxx é estável e
// o e-mail mensal de recibo reenvia o mesmo tipo de link). A proteção é a
// assinatura, não a expiração — cancelar não expõe dado sensível além do portal
// da própria Stripe.
//
// Formato: base64url(payload).base64url(hmac)  — payload = { cus }.
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import type { Result } from './result.js';

function sign(payloadB64: string): string {
  return createHmac('sha256', env.BILLING_LINK_SECRET).update(payloadB64).digest('base64url');
}

export function signCustomerToken(customerId: string): string {
  const payloadB64 = Buffer.from(JSON.stringify({ cus: customerId })).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyCustomerToken(token: string): Result<string> {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, error: 'Token inválido' };
  const payloadB64 = parts[0]!;
  const sig = parts[1]!;

  // assinatura: comparação em tempo constante (evita timing attack).
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: 'Token inválido' };
  }

  let payload: { cus?: unknown };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, error: 'Token inválido' };
  }

  if (typeof payload.cus !== 'string') {
    return { ok: false, error: 'Token inválido' };
  }

  return { ok: true, value: payload.cus };
}
