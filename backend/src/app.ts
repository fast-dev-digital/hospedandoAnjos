// =============================================================================
// app.ts — monta o Express (sem subir o servidor; testável).
// =============================================================================
// ORDEM IMPORTA por causa do raw body do webhook.
//
// PSEUDOCÓDIGO / GUIA:
//
//   import express from 'express';
//   import { corsMiddleware } from './middleware/cors';
//   import { rawBodyMiddleware } from './middleware/rawBody';
//   import { errorHandler } from './middleware/errorHandler';
//   import { postStripeWebhook } from './controllers/webhook.controller';
//   import router from './routes';
//
//   export function createApp():
//     const app = express();
//     app.use(corsMiddleware);
//     // 1) webhook PRIMEIRO, com raw body, ANTES do express.json()
//     app.post('/webhooks/stripe', rawBodyMiddleware, postStripeWebhook);
//     // 2) JSON p/ o resto
//     app.use(express.json());
//     app.use('/', router);
//     // 3) error handler por último
//     app.use(errorHandler);
//     return app;
// =============================================================================
import express  from "express";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rawBodyMiddleware } from "./middleware/rawBody.js";
import { postStripeWebhook } from "./controllers/webhook.controller.js";
import rotas from "./routes/index.js";

export function createApp() {
    const app = express();
    app.use(corsMiddleware);

    // 1) webhook PRIMEIRO, com raw body, ANTES do express.json() (assinatura).
    app.post('/webhooks/stripe', rawBodyMiddleware, postStripeWebhook);

    // 2) JSON p/ o resto das rotas.
    app.use(express.json());
    app.use('/', rotas);
    app.use(errorHandler);
    return app;
}