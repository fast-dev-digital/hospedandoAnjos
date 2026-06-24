import { describe, it, expect } from 'vitest';
import { validateCpf } from './cpf.js';

describe('validateCpf', () => {
  it('aceita um CPF válido só com dígitos e devolve normalizado', () => {
    // 529.982.247-25 é um CPF válido conhecido (dígitos verificadores corretos)
    const r = validateCpf('52998224725');
    expect(r).toEqual({ ok: true, value: '52998224725' });
  });

  it('aceita um CPF válido formatado e normaliza p/ só dígitos', () => {
    const r = validateCpf('529.982.247-25');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('52998224725');
  });

  it('rejeita dígito verificador errado', () => {
    expect(validateCpf('52998224726').ok).toBe(false);
  });

  it('rejeita todos os dígitos iguais (111.111.111-11)', () => {
    expect(validateCpf('11111111111').ok).toBe(false);
  });

  it('rejeita comprimento diferente de 11 dígitos', () => {
    expect(validateCpf('123').ok).toBe(false);
    expect(validateCpf('123456789012').ok).toBe(false);
  });

  it('rejeita valor não-string ou vazio', () => {
    expect(validateCpf('').ok).toBe(false);
    expect(validateCpf('abc.def.ghi-jk').ok).toBe(false);
  });
});
