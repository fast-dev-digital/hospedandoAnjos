import { describe, it, expect } from 'vitest';
import { signCustomerToken, verifyCustomerToken } from './billing-token.js';

// O token identifica o doador (cus_xxx) de forma assinada, p/ o link de
// cancelamento no e-mail. Sem validade: o link vale enquanto a pessoa for
// doadora (o e-mail mensal de recibo reenvia o mesmo tipo de link). A segurança
// vem da assinatura HMAC — só quem tem o segredo (backend) gera/forja.

describe('billing-token (HMAC)', () => {
  it('round-trip: verify devolve o customerId que foi assinado', () => {
    const token = signCustomerToken('cus_123');
    const r = verifyCustomerToken(token);
    expect(r).toEqual({ ok: true, value: 'cus_123' });
  });

  it('rejeita token adulterado (assinatura não confere)', () => {
    const token = signCustomerToken('cus_123');
    const adulterado = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(verifyCustomerToken(adulterado).ok).toBe(false);
  });

  it('rejeita troca do customerId mantendo a assinatura antiga', () => {
    // pega a assinatura de cus_123, mas troca o payload p/ cus_999.
    const token = signCustomerToken('cus_123');
    const [, sig] = token.split('.');
    const payloadFalso = Buffer.from(JSON.stringify({ cus: 'cus_999' })).toString('base64url');
    const forjado = `${payloadFalso}.${sig}`;
    expect(verifyCustomerToken(forjado).ok).toBe(false);
  });

  it('rejeita lixo que não é um token', () => {
    expect(verifyCustomerToken('nao-eh-token').ok).toBe(false);
    expect(verifyCustomerToken('').ok).toBe(false);
  });
});
