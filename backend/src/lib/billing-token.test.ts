import { describe, it, expect } from 'vitest';
import { signSubscriptionToken, verifySubscriptionToken } from './billing-token.js';

// O token identifica QUAL assinatura (sub_xxx do Asaas) o link de cancelamento do
// e-mail deve encerrar. Sem validade: vale enquanto a assinatura existir. A
// segurança vem da assinatura HMAC — só quem tem o segredo (backend) gera/forja.

describe('billing-token (HMAC)', () => {
  it('round-trip: verify devolve o subscriptionId que foi assinado', () => {
    const token = signSubscriptionToken('sub_123');
    const r = verifySubscriptionToken(token);
    expect(r).toEqual({ ok: true, value: 'sub_123' });
  });

  it('rejeita token adulterado (assinatura não confere)', () => {
    const token = signSubscriptionToken('sub_123');
    const adulterado = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(verifySubscriptionToken(adulterado).ok).toBe(false);
  });

  it('rejeita troca do subscriptionId mantendo a assinatura antiga', () => {
    // pega a assinatura de sub_123, mas troca o payload p/ sub_999.
    const token = signSubscriptionToken('sub_123');
    const [, sig] = token.split('.');
    const payloadFalso = Buffer.from(JSON.stringify({ sub: 'sub_999' })).toString('base64url');
    const forjado = `${payloadFalso}.${sig}`;
    expect(verifySubscriptionToken(forjado).ok).toBe(false);
  });

  it('rejeita lixo que não é um token', () => {
    expect(verifySubscriptionToken('nao-eh-token').ok).toBe(false);
    expect(verifySubscriptionToken('').ok).toBe(false);
  });
});
