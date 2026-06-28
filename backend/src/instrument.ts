// =============================================================================
// instrument.ts — inicializa o Sentry. DEVE ser importado ANTES de qualquer
// outro módulo (instrumenta o Express/HTTP por auto-instrumentation).
// =============================================================================
// No-op se SENTRY_DSN não estiver setado: dev local e testes rodam sem Sentry,
// sem precisar de credencial. Em produção (Coolify), basta setar SENTRY_DSN.
// =============================================================================
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // amostra de performance baixa (só erros importam aqui); ajuste se quiser tracing.
    tracesSampleRate: 0.1,
  });
}
