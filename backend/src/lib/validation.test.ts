import { describe, it, expect } from 'vitest';
import { validateCheckout } from './validation.js';

// o front envia o valor já em centavos (parseToCents); o backend só revalida.
const valido = {
  type: 'avulsa',
  amountInCents: 5000, // R$50,00
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  whatsapp: '+5511999998888',
};

describe('validateCheckout', () => {
  describe('payload válido', () => {
    it('aceita e devolve value sanitizado', () => {
      const r = validateCheckout(valido);
      expect(r).toEqual({ ok: true, value: valido });
    });

    it('trima nome e email e normaliza o whatsapp', () => {
      const r = validateCheckout({
        ...valido,
        name: '  Maria Silva  ',
        email: '  maria@exemplo.com  ',
        whatsapp: ' +55 (11) 99999-8888 ',
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.name).toBe('Maria Silva');
        expect(r.value.email).toBe('maria@exemplo.com');
        expect(r.value.whatsapp).toBe('+5511999998888');
      }
    });

    it('aceita recorrente com valor >= 2000', () => {
      expect(validateCheckout({ ...valido, type: 'recorrente', amountInCents: 2000 }).ok).toBe(true);
    });
  });

  describe('campos inválidos isolados', () => {
    it('rejeita body que não é objeto', () => {
      expect(validateCheckout(null).ok).toBe(false);
      expect(validateCheckout('texto').ok).toBe(false);
    });

    it('rejeita type inválido', () => {
      const r = validateCheckout({ ...valido, type: 'mensal' });
      expect(r.ok).toBe(false);
    });

    it('rejeita nome vazio', () => {
      const r = validateCheckout({ ...valido, name: '   ' });
      expect(r.ok).toBe(false);
    });

    it('rejeita email malformado', () => {
      const r = validateCheckout({ ...valido, email: 'maria.exemplo.com' });
      expect(r.ok).toBe(false);
    });

    it('rejeita valor abaixo do mínimo avulsa', () => {
      const r = validateCheckout({ ...valido, amountInCents: 50 });
      expect(r.ok).toBe(false);
    });

    it('rejeita recorrente abaixo de 2000', () => {
      const r = validateCheckout({ ...valido, type: 'recorrente', amountInCents: 1500 });
      expect(r.ok).toBe(false);
    });

    it('rejeita whatsapp sem código de país', () => {
      const r = validateCheckout({ ...valido, whatsapp: '11999998888' });
      expect(r.ok).toBe(false);
    });
  });

  describe('acumula múltiplos erros', () => {
    it('junta todos os erros de uma vez', () => {
      const r = validateCheckout({
        type: 'mensal',
        amountInCents: 10,
        name: '',
        email: 'nao-eh-email',
        whatsapp: '123',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        // type, name, email, whatsapp inválidos (amount não checa mínimo pq type é inválido)
        expect(r.errors.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
