// =============================================================================
// app.ts — monta o Express (sem subir o servidor; testável).
// =============================================================================
// Asaas valida o webhook por token no header (não por assinatura HMAC sobre o
// corpo cru), então NÃO há mais rawBody nem ordem especial: o webhook é uma rota
// JSON normal como as demais (ver ADR-0005).
// =============================================================================
import express from "express";
import * as Sentry from "@sentry/node";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import rotas from "./routes/index.js";

export function createApp() {
    const app = express();
    app.use(corsMiddleware);
    app.use(express.json());
    app.use('/', rotas);
    // captura erros das rotas no Sentry (no-op sem SENTRY_DSN). Vai ANTES do nosso
    // errorHandler para que o erro chegue ao Sentry antes de virar resposta 500.
    Sentry.setupExpressErrorHandler(app);
    app.use(errorHandler);
    return app;
}
