// =============================================================================
// controllers/checkout.controller.ts — FINO: extrai req, chama service, responde.
// =============================================================================
// PSEUDOCÓDIGO / GUIA:
//
//   import { startCheckout } from '../services/checkout.service';
//
//   export async function postCheckout(req, res, next):
//     try:
//       result = await startCheckout(req.body)   // { checkoutUrl }
//       res.status(200).json(result)
//     catch (e):
//       next(e)   // ValidationError -> 400 ; resto -> 500 (error handler)
//
// Sem regra de negócio aqui. Sem falar com o Asaas direto.
// =============================================================================
import { startCheckout } from '../services/checkout.service.js';
import type { Request, Response, NextFunction } from 'express';
export async function postCheckout(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await startCheckout(req.body); // { checkoutUrl }
        res.status(200).json(result);
    } catch (e) {
        next(e); // ValidationError -> 400 ; resto -> 500 (error handler)
    }
}