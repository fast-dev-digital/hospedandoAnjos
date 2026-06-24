# Handoff — Migração Asaas: issues #5, #6, #7 implementadas

## Tipo desta sessão
Início da **migração de gateway Stripe → Asaas** no código. As sessões anteriores
estão em `docs/handoff-*.md`. Esta implementou as 3 primeiras issues da migração
(camada de checkout) e deixou o webhook/cancelamento como stubs até as issues delas.

## Fontes da verdade (ler primeiro)
- [ADR-0005](adr/0005-migracao-stripe-para-asaas.md) — **a spec da migração**. As 10
  decisões + o mapeamento de eventos. **Já corrigido** nesta sessão (decisão #7:
  avulsa usa `billingType: UNDEFINED` + boleto desabilitado na conta, não métodos
  especificados — a doc do Asaas confirmou que billingType não aceita lista).
- `CONTEXT.md` — já reescrito para o Asaas (sessão anterior).
- Issues #5–#11 no GitHub (`fast-dev-digital/hospedandoAnjos`) — a #6 foi corrigida
  (nota do UNDEFINED). #5/#6/#7 = feitas nesta sessão; #8/#9/#10/#11 = pendentes.
- Commits desta sessão: `a548b47` (adapter+checkout+cpf), `ad43d20` (stubs http),
  `d709e4f` (correção ADR). Todos em `main`, local (sem push).

## O que foi implementado (#5/#6/#7) — ver o diff, não duplicar
- `integrations/asaas.ts` (novo, substitui stripe.ts): `findOrCreateCustomer`,
  `getCustomer`, `createPayment` (avulsa), `createSubscription` (recorrente).
  fetch nativo, auth por header `access_token`.
- `lib/cpf.ts` (novo): validação de dígito verificador + normalização.
- `lib/validation.ts`, `shared/checkout-contract.ts`: + campo `cpf`.
- `checkout.service.ts`: orquestra cliente → cobrança/assinatura → invoiceUrl.
- `config/env.ts`: `ASAAS_*`; removidos `STRIPE_*` e `PIX_ENABLED`. Dep `stripe` removida.
- **74 testes verdes, tsc limpo.**

## Decisões de implementação tomadas (grill-me, fáceis de quebrar)
- **Cliente:** reuso por e-mail (`GET /customers?email=`); cria com `cpfCnpj`.
- **CPF:** validado (dígito verificador) e normalizado p/ só-dígitos no backend.
- **Avulsa:** `billingType: UNDEFINED` → página mostra PIX + cartão. **Exige
  desabilitar o boleto na conta Asaas** (senão aparece). `dueDate` = hoje.
- **Recorrente:** `billingType: CREDIT_CARD`, `cycle: MONTHLY`. A 1ª cobrança é
  criada DEPOIS da assinatura → busca via `GET /subscriptions/{id}/payments` p/ a
  invoiceUrl (documentado; não vem na resposta do POST /subscriptions).
- **callback:** `successUrl = {FRONTEND_ORIGIN}/obrigado`, `autoRedirect: true`.
- **Valor:** Asaas trabalha em reais decimais; o adapter converte centavos→reais
  (`/100`). O contrato/validação seguem em centavos (o front converte; ver
  sessões anteriores).

## Stubs deixados (partes de outras issues, só p/ compilar)
NÃO são a implementação real — são placeholders 501 "em migração":
- `controllers/webhook.controller.ts` (`postAsaasWebhook` → 501) — real na **#8**.
- `controllers/billing.controller.ts` (`cancelSubscription` → 501) — real na **#10**.
- `services/webhook.service.ts` (`handleAsaasEvent` vazio) — real na **#8**.
- Removidos: `middleware/rawBody.ts`, `webhook.service.test.ts` (Asaas não usa HMAC).
- **Preservados p/ reaproveitar:** `services/donor.service.ts` (lógica de upsert no
  Brevo, regra dos 2 grupos) e `lib/billing-token.ts` (HMAC; passará a assinar o
  `subscription_id` na #10). `donor.service.test.ts` ainda passa.

## Próximas issues (ordem)
- **#8** webhook Asaas: `/webhooks/asaas` valida token do header (`===`), trata
  `PAYMENT_CONFIRMED` (distingue avulsa/recorrente pelo campo `subscription`; lê
  dados via `getCustomer`); upsert no Brevo. Religa `donor.service`.
- **#9** status: `PAYMENT_OVERDUE`→falha, `SUBSCRIPTION_DELETED`→inativo; grava
  `ASAAS_SUBSCRIPTION_ID` no Brevo.
- **#10** cancelamento: `/cancelar?t=token` (assina subscription_id) →
  `DELETE /subscriptions/{id}`. Reaproveita `billing-token`.
- **#11** limpeza: remover resíduos, comentário do `cors.ts`, grep final.

## Bloqueios externos / config (não-código)
- **Conta Asaas:** desabilitar o **boleto** (senão aparece na avulsa). Confirmar
  PIX habilitado. Cadastrar o webhook → `/webhooks/asaas` com o `ASAAS_WEBHOOK_TOKEN`.
- **Credenciais no `.env`:** `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_BASE_URL`
  (sandbox: `https://api-sandbox.asaas.com/v3`). As Stripe saíram.
- **Brevo:** criar `ASAAS_SUBSCRIPTION_ID` (atributo). O resto já configurado.
- **Frontend:** adicionar campo CPF ao form; `VITE_STRIPE_PUBLISHABLE_KEY` não é
  mais usada (Asaas é redirect puro).

## Notas de ambiente
- Windows. Testes/tsc rodam com sandbox desabilitado (seguros). Mudar `.env`
  exige reiniciar o backend (`tsx watch` não observa `.env`).
- Para commit multilinha: heredoc `git commit -F - <<'EOF'`. `git rm` deixa o
  arquivo staged como deletado — não tentar `git add` o caminho de novo no mesmo lote.

## Skills sugeridas p/ a próxima sessão
- **`tdd`** — continuar #8/#9/#10 em red-green (o padrão desta sessão).
- **`verify`** — quando a conta Asaas estiver configurada, testar o fluxo real
  (checkout → invoiceUrl → pagar no sandbox → webhook → Brevo).
