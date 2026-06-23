// =============================================================================
// middleware/errorHandler.ts — handler central de erros.
// =============================================================================
// PSEUDOCÓDIGO / GUIA:
//
//   export class ValidationError extends Error { errors; constructor(errors){...} }
//
//   export function errorHandler(err, _req, res, _next):
//     if (err instanceof ValidationError):
//       return res.status(400).json({ errors: err.errors })
//     log(err)
//     res.status(500).json({ error: 'erro interno' })
//
//   // registrar por último no app.ts: app.use(errorHandler)
// =============================================================================
import { ValidationError } from '../lib/errors.js';
import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
}