import { describe, it, expect } from 'vitest';
import { normalizeE164, toAsaasMobilePhone, fromAsaasMobilePhone } from './phone.js';

describe('normalizeE164', () => {
  describe('aceita e normaliza números E.164 válidos', () => {
    it('número BR já em E.164', () => {
      expect(normalizeE164('+5511999998888')).toEqual({
        ok: true,
        value: '+5511999998888',
      });
    });

    it('limpa espaços, parênteses e hífens', () => {
      expect(normalizeE164(' +55 (11) 99999-8888 ')).toEqual({
        ok: true,
        value: '+5511999998888',
      });
    });

    it('aceita outros países (US)', () => {
      const r = normalizeE164('+12125550123');
      expect(r.ok).toBe(true);
    });

    it('aceita Portugal', () => {
      const r = normalizeE164('+351912345678');
      expect(r.ok).toBe(true);
    });
  });

  describe('rejeita sem código de país (sem default +55)', () => {
    it('número nacional sem +', () => {
      expect(normalizeE164('11999998888').ok).toBe(false);
    });

    it('com DDD mas sem +', () => {
      expect(normalizeE164('(11) 99999-8888').ok).toBe(false);
    });
  });

  describe('rejeita entradas inválidas', () => {
    it('string vazia', () => {
      expect(normalizeE164('').ok).toBe(false);
    });

    it('texto', () => {
      expect(normalizeE164('não é telefone').ok).toBe(false);
    });

    it('número curto demais', () => {
      expect(normalizeE164('+5511').ok).toBe(false);
    });
  });
});

describe('toAsaasMobilePhone', () => {
  it('remove o +55 de um número BR (Asaas quer DDD+número)', () => {
    expect(toAsaasMobilePhone('+5511999998888')).toBe('11999998888');
  });

  it('remove o código de país de um número não-BR (melhor esforço)', () => {
    expect(toAsaasMobilePhone('+351912345678')).toBe('912345678');
  });

  it('cai p/ só-dígitos quando não consegue parsear', () => {
    expect(toAsaasMobilePhone('11999998888')).toBe('11999998888');
  });
});

describe('fromAsaasMobilePhone', () => {
  it('reconstrói o +55 a partir do número nacional do Asaas', () => {
    expect(fromAsaasMobilePhone('19986031086')).toBe('+5519986031086');
  });

  it('não duplica o 55 se já vier com código de país', () => {
    expect(fromAsaasMobilePhone('5519986031086')).toBe('+5519986031086');
  });

  it('limpa máscara antes de montar', () => {
    expect(fromAsaasMobilePhone('(19) 98603-1086')).toBe('+5519986031086');
  });

  it('vazio -> string vazia', () => {
    expect(fromAsaasMobilePhone('')).toBe('');
  });
});
