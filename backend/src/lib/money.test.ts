import { describe, it, expect } from 'vitest';
import { validateAmount } from './money.js';
import type { DonationType } from '../../../shared/checkout-contract.js';

describe('validateAmount', () => {
  describe('avulsa (mínimo R$5,00 = 500 centavos)', () => {
    it('aceita exatamente 500', () => {
      expect(validateAmount('avulsa', 500)).toEqual({ ok: true });
    });

    it('aceita acima do mínimo', () => {
      expect(validateAmount('avulsa', 5000)).toEqual({ ok: true });
    });

    it('rejeita abaixo do mínimo do Asaas (499)', () => {
      expect(validateAmount('avulsa', 499).ok).toBe(false);
    });
  });

  describe('recorrente (mínimo R$20,00 = 2000 centavos)', () => {
    it('aceita exatamente 2000', () => {
      expect(validateAmount('recorrente', 2000)).toEqual({ ok: true });
    });

    it('rejeita abaixo do mínimo (1999)', () => {
      expect(validateAmount('recorrente', 1999).ok).toBe(false);
    });

    it('rejeita um valor que passaria como avulsa (150)', () => {
      expect(validateAmount('recorrente', 150).ok).toBe(false);
    });
  });

  describe('valores inválidos (independe do tipo)', () => {
    it('rejeita zero', () => {
      expect(validateAmount('avulsa', 0).ok).toBe(false);
    });

    it('rejeita negativo', () => {
      expect(validateAmount('avulsa', -100).ok).toBe(false);
    });

    it('rejeita não-inteiro (centavos fracionados)', () => {
      expect(validateAmount('avulsa', 100.5).ok).toBe(false);
    });

    it('rejeita NaN', () => {
      expect(validateAmount('avulsa', Number.NaN).ok).toBe(false);
    });
  });

  describe('tipo inválido', () => {
    it('rejeita um tipo desconhecido mesmo com valor alto', () => {
      // tipo inválido vindo de fora do TS (ex.: payload cru do browser)
      const tipoInvalido = 'mensal' as DonationType;
      expect(validateAmount(tipoInvalido, 5000).ok).toBe(false);
    });
  });
});
