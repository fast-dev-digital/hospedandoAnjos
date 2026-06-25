// =============================================================================
// lib/billing-token.ts — token assinado (HMAC) que identifica QUAL assinatura o
// link de cancelamento deve cancelar. Quase puro: só depende do segredo do env
// e do crypto nativo.
// =============================================================================
// Por que existe: o link de cancelamento vai no e-mail e chama a API direto. O
// token prova QUAL é a assinatura (sub_xxx do Asaas) sem login. Como é assinado
// com um segredo que só o backend tem, ninguém forja/troca o id p/ cancelar a
// assinatura de outra pessoa (proteção contra IDOR).
//
// Migração Stripe->Asaas (ADR-0005, decisão #3): antes assinávamos o customerId
// p/ abrir o billing portal; agora assinamos o subscription_id porque o Asaas não
// tem portal — o backend chama DELETE /subscriptions/{id} direto.
//
// Sem validade: o link vale enquanto a assinatura existir (o sub_xxx é estável e
// o e-mail mensal de recibo reenvia o mesmo link). A proteção é a assinatura HMAC,
// não a expiração — cancelar não expõe dado sensível, só encerra a recorrência.
//
// Formato: base64url(payload).base64url(hmac)  — payload = { sub }.
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import type { Result } from './result.js';

// HMAC-SHA256 do payload (já em base64url) com o segredo do backend.
function sign(payloadB64: string): string {
  return createHmac('sha256', env.BILLING_LINK_SECRET).update(payloadB64).digest('base64url');
}

// gera o token a partir do id da assinatura: { sub: "sub_xxx" } -> "payload.assinatura".
export function signSubscriptionToken(subscriptionId: string): string {
  const payloadB64 = Buffer.from(JSON.stringify({ sub: subscriptionId })).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

// valida o token recebido no link e devolve o subscription_id (ou erro).
export function verifySubscriptionToken(token: string): Result<string> {
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

  // só decodifica o payload DEPOIS de validar a assinatura (não confiar antes).
  let payload: { sub?: unknown };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, error: 'Token inválido' };
  }

  if (typeof payload.sub !== 'string') {
    return { ok: false, error: 'Token inválido' };
  }

  return { ok: true, value: payload.sub };
}
