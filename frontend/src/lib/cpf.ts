// =============================================================================
// lib/cpf.ts — validação, normalização e máscara de CPF no front. PURO.
// =============================================================================
// Espelha a regra do backend (../../backend/src/lib/cpf.ts): o Asaas exige um
// cpfCnpj válido para criar o cliente. Validar aqui dá mensagem clara ao doador
// antes de ir ao gateway. O payload do checkout envia só dígitos (onlyDigits).
// =============================================================================

/** Só os dígitos do CPF, limitado a 11 (descarta o que sobra ao colar/digitar). */
export function onlyDigits(raw: string): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 11);
}

/** Aplica a máscara progressiva 000.000.000-00 conforme o doador digita. */
export function formatCpf(raw: string): string {
  const d = onlyDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// calcula um dígito verificador do CPF (módulo 11). Igual ao backend.
function digit(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** Valida o CPF (módulo 11). Aceita formatado ou só dígitos. */
export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw);

  if (cpf.length !== 11) return false;
  // todos os dígitos iguais (ex.: 111.111.111-11) passam no módulo 11 mas são inválidos.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const d1 = digit(cpf.slice(0, 9), 10);
  const d2 = digit(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}
