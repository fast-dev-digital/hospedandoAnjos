# 5. Migração do gateway de pagamento: Stripe → Asaas

Data: 2026-06-24

## Status

Aceito. **Supersede o ADR-0001** (Stripe Checkout hospedado) e o **ADR-0003**
(métodos de pagamento na Stripe). Mantém o ADR-0002 (arquitetura em camadas) e o
ADR-0004 (Brevo + n8n + Manychat) — a mensageria e o desenho de camadas não mudam.

## Contexto

O backend foi implementado e validado de ponta a ponta com a **Stripe** (checkout
avulso e recorrente criando sessões reais, webhook → cadastro no Brevo
funcionando). Porém, ao testar com a conta real, descobriu-se que **a Stripe não
disponibiliza PIX** para a conta sem um histórico de movimentação (~60 dias) — e
**o PIX nem aparecia como opção na doação avulsa**. Como o público-alvo é
brasileiro e o PIX é o meio de pagamento dominante para doação por impulso, operar
sem PIX desde o início é inviável.

Os stakeholders decidiram **migrar para o Asaas** (gateway brasileiro), que oferece
PIX nativamente, além de cartão e boleto, e cobranças recorrentes (inclusive PIX
Automático). A migração é estrutural: o modelo conceitual do Asaas difere do da
Stripe em pontos centrais (cliente obrigatório com CPF, sem checkout session,
webhook sem assinatura HMAC, cancelamento sem billing portal hospedado).

## Decisão

Adotar o **Asaas** como gateway. As decisões de design abaixo foram tomadas numa
sessão de grill-me (entrevista estruturada), uma a uma:

1. **Cadastro invisível preservado, mas com cliente explícito.** O Asaas exige um
   `customer` criado antes da cobrança. O backend cria/reusa o cliente buscando
   por e-mail (`GET /customers?email=`) antes de cobrar — mantém o stateless
   (Asaas é a fonte da verdade do doador) e o "sem senha/conta" para o doador.

2. **Campo CPF no formulário.** O Asaas exige `cpfCnpj` na criação do cliente (não
   é contornável). O form ganha o campo CPF além de nome/email/telefone. Bônus:
   destrava o recibo de doação (dedução fiscal) já previsto como futuro.

3. **Cancelamento via API, link de 1 clique.** Não há billing portal hospedado
   como o da Stripe. O e-mail traz um link assinado; ao clicar, o backend valida o
   token e chama `DELETE /subscriptions/{id}`. O `lib/billing-token.ts` (HMAC, sem
   validade) é **reaproveitado** — passa a assinar o `subscription_id` em vez do
   customer. Trade-off aceito: 1 clique cancela sem tela de confirmação (risco de
   clique acidental/bot), em favor da simplicidade (só backend).

4. **Webhook validado por token no header.** O Asaas não usa assinatura HMAC; envia
   um token compartilhado no header `asaas-access-token`. Validação por comparação
   simples (`===`) com `env.ASAAS_WEBHOOK_TOKEN`. Como não há corpo cru a validar,
   o `middleware/rawBody.ts` e a reordenação do `app.ts` (webhook antes do
   `express.json()`) são **removidos** — o webhook usa `express.json()` normal.

5. **Cadastro/agradecimento no `PAYMENT_CONFIRMED`.** É o gatilho único que dispara
   o cadastro no Brevo (e o agradecimento via `DATA_ULTIMA`). O `PAYMENT_RECEIVED`
   subsequente da mesma cobrança é ignorado (não duplicar). Equivale ao
   `checkout.session.completed` da Stripe.

6. **Avulsa vs recorrente pelo campo `subscription` do evento.** A cobrança de uma
   assinatura traz `subscription` preenchido; a avulsa traz `null`. Substitui o
   `metadata.type` da Stripe. Os dados do doador (nome/telefone/CPF) são lidos via
   `GET /customers/{id}` no webhook (o cliente é a fonte da verdade).

7. **Métodos: avulsa = PIX + cartão; recorrente = cartão.** Sem boleto (fricção
   alta, ruim para doação por impulso). Implementação confirmada na doc do Asaas:
   `billingType` **não aceita lista** — ou é um método único, ou `UNDEFINED`.
   Para "PIX + cartão sem boleto" na avulsa, usa-se **`billingType: UNDEFINED`** na
   API **+ boleto DESABILITADO nas configurações da conta** (o `UNDEFINED` respeita
   só os métodos habilitados). A recorrente usa `billingType: CREDIT_CARD` fixo.
   PIX recorrente (PIX Automático) fica fora por ora — pode exigir habilitação
   própria na conta; liga-se depois se desejado.
   > Config de conta necessária: **desabilitar o boleto** no painel do Asaas,
   > senão ele aparece na avulsa (o `UNDEFINED` mostraria PIX + cartão + boleto).

8. **Redirect mantido.** O backend cria a cobrança com `callback.successUrl =
   {FRONTEND_ORIGIN}/obrigado` e recebe `invoiceUrl` (página hospedada do Asaas).
   O contrato compartilhado mantém o nome `{ checkoutUrl }` (genérico — o front
   não muda).

9. **Brevo: `ASAAS_SUBSCRIPTION_ID` substitui `STRIPE_CUSTOMER_ID`.** Guarda-se
   apenas o `subscription_id` (essencial para o link de cancelamento). O customer
   não é gravado — é sempre reachável pelo e-mail no Asaas.

10. **Inativar reativamente no `SUBSCRIPTION_DELETED`.** O cancelamento (do nosso
    link OU direto no painel Asaas OU por inadimplência) dispara
    `SUBSCRIPTION_DELETED` → backend marca `STATUS=inativo` no Brevo. O endpoint de
    cancelamento só executa o `DELETE`; o webhook cuida do Brevo. Mesmo padrão
    reativo do `customer.subscription.deleted` da Stripe.

**Recibo mensal simplificado:** no Asaas, primeira mensalidade e renovações geram
o mesmo `PAYMENT_CONFIRMED` (cada cobrança é única). Não há a separação
`checkout.session.completed` vs `invoice.payment_succeeded` da Stripe — então a
lógica de `subscription_cycle`/ignorar a 1ª fatura **desaparece**. Todo
`PAYMENT_CONFIRMED` atualiza `DATA_ULTIMA` e dispara um e-mail.

## Mapeamento de eventos (Stripe → Asaas)

| Responsabilidade | Stripe (antes) | Asaas (agora) |
|---|---|---|
| Doação confirmada → cadastra Brevo | `checkout.session.completed` | `PAYMENT_CONFIRMED` |
| Renovação mensal → recibo | `invoice.payment_succeeded` (cycle) | `PAYMENT_CONFIRMED` (com `subscription`) |
| Falha de pagamento → STATUS falha | `invoice.payment_failed` | `PAYMENT_OVERDUE` |
| Cancelamento → STATUS inativo | `customer.subscription.deleted` | `SUBSCRIPTION_DELETED` |

## Consequências

- **Reaproveitado:** ADR-0002 (camadas/adapters — só o adapter muda: `stripe.ts`
  vira `asaas.ts`), ADR-0004 (Brevo/n8n/Manychat intacto), `lib/` puro (money,
  phone, validation), `lib/billing-token.ts` (passa a assinar subscription_id),
  o desenho do contrato compartilhado.
- **Removido:** `middleware/rawBody.ts` e a reordenação do `app.ts` (sem HMAC),
  toda a lógica de `subscription_cycle`/`reaisToCents` da Stripe, `PIX_ENABLED`
  (no Asaas o PIX é nativo na avulsa).
- **Novo no env:** `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_BASE_URL`
  (sandbox vs produção). Saem: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `PIX_ENABLED`.
- **Novo no Brevo:** atributo `ASAAS_SUBSCRIPTION_ID` (sai `STRIPE_CUSTOMER_ID`).
- **Novo no form:** campo CPF.
- **Idempotência:** o Asaas é at-least-once (igual Stripe). De-dupe natural pelo
  upsert por e-mail no Brevo — segue stateless, sem guardar IDs de evento.
- **Trabalho de código** (fora desta decisão, que é de documentação): reescrever o
  adapter, o webhook.service, o checkout.service e os testes. Será quebrado em
  issues próprias. O código Stripe atual permanece até a migração ser feita.
- **Não migrar** o gateway exigiria operar sem PIX na avulsa — inviável para o
  público brasileiro. Por isso a migração, apesar do retrabalho.
