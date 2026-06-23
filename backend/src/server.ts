// =============================================================================
// server.ts — ponto de entrada: sobe o HTTP server.
// =============================================================================
// PSEUDOCÓDIGO / GUIA:
//
//   import { createApp } from './app';
//   import { env } from './config/env';   // valida env no boot (falha rápido)
//
//   const app = createApp();
//   app.listen(env.PORT, () => console.log(`API on :${env.PORT}`));
// =============================================================================
import { createApp } from "./app.js";
import { env } from "./config/env.js";

createApp().listen(env.PORT, () => console.log(`API on :${env.PORT}`));