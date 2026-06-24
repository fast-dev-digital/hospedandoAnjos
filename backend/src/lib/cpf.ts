// =============================================================================
// lib/cpf.ts — validação e normalização de CPF. PURO. Testável.
// =============================================================================
// O Asaas exige cpfCnpj válido ao criar o cliente. Validar aqui dá mensagem
// clara ao doador e evita uma ida desnecessária ao gateway (que devolveria um
// erro genérico). Devolve o CPF só com dígitos (formato que o Asaas espera).
// =============================================================================

import type { Result } from './result.js';

// calcula um dígito verificador do CPF (módulo 11).
function digit(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function validateCpf(raw: string): Result<string> {
  const cpf = (raw ?? '').replace(/\D/g, '');

  if (cpf.length !== 11) {
    return { ok: false, error: 'CPF inválido' };
  }
  // todos os dígitos iguais (ex.: 111.111.111-11) passam no módulo 11 mas são inválidos.
  if (/^(\d)\1{10}$/.test(cpf)) {
    return { ok: false, error: 'CPF inválido' };
  }

  const d1 = digit(cpf.slice(0, 9), 10);
  const d2 = digit(cpf.slice(0, 10), 11);
  if (d1 !== Number(cpf[9]) || d2 !== Number(cpf[10])) {
    return { ok: false, error: 'CPF inválido' };
  }

  return { ok: true, value: cpf };
}
