# Handoff — Migração Asaas concluída em código: issues #8, #9, #10, #11

## Tipo desta sessão
**Fechamento da migração Stripe → Asaas no código.** As 3 primeiras slices
(#5/#6/#7 — fundação + checkout) já estavam feitas (ver
`docs/handoff-migracao-asaas-issues-5-6-7.md`). Esta sessão implementou as 4
restantes: **#8 (webhook+Brevo), #9 (status), #10 (cancelamento), #11 (limpeza)**.
Com isso **as 7 issues da migração estão 100% implementadas em código** — só
restam config externa e verificação real (ver "O que falta" abaixo).

> ⚠️ Numeração: os handoffs antigos falavam em "#8/#9/#10/#11" como apelido das
> 4 últimas slices. No **GitHub** as issues da migração são **#5 a #11**:
> #8=webhook, #9=status, #10=cancelamento, #11=limpeza. Este doc usa a numeração
> do GitHub.

## Fontes da verdade (ler primeiro)
- [ADR-0005](adr/0005-migracao-stripe-para-asaas.md) — a spec da migração (10
  decisões + mapeamento de eventos). Inalterado nesta sessão.
- `CONTEXT.md` — atualizado nesta sessão: `VALOR`/`VALOR_ULTIMA` agora em **reais**
  (não centavos) — ver decisão abaixo.
- Issues #5–#11 (`fast-dev-digital/hospedandoAnjos`) — **todas implementadas em
  código**; seguem OPEN no GitHub até a verificação real (sem credenciais ainda).
- Diff desta sessão (ler, não duplicar): 16 arquivos, webhook.service/donor.service/
  billing-token reescritos; comentários e .env.example migrados. Local, sem commit
  ainda no momento deste handoff.

## O que foi implementado nesta sessão — ver o diff
- **#8 webhook** (`webhook.controller.ts` + `webhook.service.ts`): `/webhooks/asaas`
  valida o token do header `asaas-access-token` (`===`, 401 se falha); rota JSON
  normal (rawBody já não existia). `PAYMENT_CONFIRMED` → lê o doador via
  `getCustomer` → distingue avulsa/recorrente por `payment.subscription` → upsert
  no Brevo (donor.service). Evento não mapeado → 200 (não reenvia). Erro → 500.
- **#9 status** (`webhook.service.ts`): `PAYMENT_OVERDUE` → `markPaymentFailed`;
  `SUBSCRIPTION_DELETED` → `markSubscriptionInactive`. `donor.service` grava
  `ASAAS_SUBSCRIPTION_ID` (era `STRIPE_CUSTOMER_ID`).
- **#10 cancelamento** (`billing.controller.ts` + `asaas.ts` + `billing-token.ts`):
  `GET /cancelar?t=token` valida o token → `cancelSubscriptionById` →
  `DELETE /subscriptions/{id}`. Token inválido → 400. `billing-token` passou a
  assinar o `subscription_id` (`signSubscriptionToken`/`verifySubscriptionToken`).
  `donor.service` grava `LINK_CANCELAMENTO = {API_BASE_URL}/cancelar?t=...` no Brevo.
- **#11 limpeza**: grep limpo (sem `checkout.session`/`whsec`/`billingPortal`/etc.);
  `stripe.ts`/`stripe.test.ts`/`rawBody.ts` já não existiam; sem dep `stripe`;
  comentários migrados (`cors.ts`, `brevo.ts`, `checkout.controller.ts`, `money.ts`);
  `.env.example` reescrito para `ASAAS_*`.
- **82 testes verdes, `tsc --noEmit` limpo.**

## Decisão tomada nesta sessão (fácil de quebrar sem saber)
- **`VALOR`/`VALOR_ULTIMA` no Brevo = REAIS, não centavos.** O usuário apontou que
  o campo vira variável de recibo (`{{VALOR}}`) — gravar centavos mostraria
  "R$ 2000". Não estava na ADR; era convenção herdada da Stripe. Agora: o webhook
  passa `payment.value` (reais do Asaas) direto; o `donor.service` usa `valorReais`.
  **O checkout/validação interna SEGUE em centavos** (mínimos, `toReais` na ida) —
  só o Brevo passou a reais. Documentado no CONTEXT.md.
- **Confirmado (não é mudança):** o backend só GERA o `LINK_CANCELAMENTO` e o grava
  no Brevo; **quem monta o e-mail de cancelamento é o usuário, no Brevo**, usando a
  variável. O backend não envia e-mail (ADR-0004: Brevo/n8n disparam).

## ⚠️ Ponto de verificação aberto (checar no sandbox)
- **`payment.value` do webhook Asaas vem em reais decimais?** O código assume que
  sim (e o adapter `toReais` na ida confirma o modelo decimal do Asaas). Se vier em
  centavos, o `VALOR` do recibo fica 100× errado — o único ajuste seria reintroduzir
  uma conversão em `webhook.service.ts`. **Confirmar com um evento real.**

## O que falta para FECHAR as issues (tudo não-código)
1. **Credenciais no `.env`:** `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` estão VAZIAS
   — é o que derruba o `tsx watch` no boot (`required('ASAAS_API_KEY')`).
   `BILLING_LINK_SECRET` e `BREVO_API_KEY` já estão preenchidas. `.env` é gitignored
   (não vai pro repo); o template é o `.env.example` (já migrado).
2. **Conta Asaas:** desabilitar o **boleto** (senão aparece na avulsa via UNDEFINED);
   confirmar PIX habilitado; cadastrar o webhook → `/webhooks/asaas` com o mesmo
   `ASAAS_WEBHOOK_TOKEN` do `.env`.
3. **Brevo:** criar o atributo **`ASAAS_SUBSCRIPTION_ID`** (atributo inexistente é
   ignorado em silêncio no upsert — mesma pegadinha dos handoffs anteriores).
4. **Verificação ponta-a-ponta** (skill `verify`) no sandbox: checkout → invoiceUrl
   → pagar → `PAYMENT_CONFIRMED` → Brevo → clicar `/cancelar` → `SUBSCRIPTION_DELETED`
   → STATUS=inativo. Confirmar também o ponto do `payment.value` acima.
5. **Frontend** (time): campo CPF no form; lembrar que `amountInCents` carrega REAIS
   (o backend converte) — manda 20, não 2000.

## Notas de ambiente
- Windows. Testes/tsc rodam com sandbox desabilitado (seguros). Mudar `.env` exige
  reiniciar o backend (`tsx watch` não observa `.env`). Warnings LF→CRLF normais.
- Jobs `tsx watch` em background de janelas antigas falham com
  `Variável obrigatória ausente: ASAAS_API_KEY` — é a config (#1 acima), não o código.

## Skills sugeridas p/ a próxima sessão
- **`verify`** — quando as credenciais Asaas chegarem, validar o fluxo real.
- **`triage`** — fechar as issues #5–#11 no GitHub após a verificação passar.
