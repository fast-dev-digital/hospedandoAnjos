// =============================================================================
// lib/errors.ts — erros de domínio. PURO (sem Express).
// =============================================================================
// ValidationError = entrada inválida do doador. O errorHandler (middleware)
// traduz para HTTP 400. lib/ não conhece Express -> o erro mora aqui.
// =============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
