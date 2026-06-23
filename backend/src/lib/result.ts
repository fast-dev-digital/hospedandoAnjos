// =============================================================================
// lib/result.ts — tipo de resultado das libs puras. Sem throw, sem Express.
// =============================================================================
// Result<T>      -> sucesso carrega um valor (ex.: phone devolve o E.164).
// Result<void>   -> sucesso sem valor (ex.: money só valida).
// Multi: errors[] -> validação que junta vários erros (ex.: validation).
// =============================================================================

export type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; value: T })
  | { ok: false; error: string };

// Para validações que acumulam vários erros de uma vez.
export type MultiResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };
