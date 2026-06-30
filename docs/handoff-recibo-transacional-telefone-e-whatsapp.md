# Handoff — Recibo transacional, fix de telefone, mínimo R$5 e a saga do WhatsApp

Data: 2026-06-30

## Tipo desta sessão
Sessão longa de **correções e migração** sobre o sistema já no ar (produção
apontando p/ Asaas **sandbox**). Quatro entregas de código + uma investigação
exaustiva do WhatsApp que terminou num diagnóstico de infra (não-código). Tudo
testado ao vivo. Base do sandbox/Brevo foi limpa e revalidada do zero.

## Fontes da verdade (ler primeiro)
- [ADR-0005](adr/0005-migracao-stripe-para-asaas.md) — migração Asaas.
- [ADR-0004](adr/0004-mensageria-brevo-n8n-manychat-desde-o-inicio.md) — mensageria.
- [handoff-telefone-asaas-sentry-e-transparencia](handoff-telefone-asaas-sentry-e-transparencia.md) — sessão anterior (telefone, Sentry, FAQ).
- [handoff-brevo-recibo-e-automacao](handoff-brevo-recibo-e-automacao.md) — recibo/atributos Brevo.

## Commits desta sessão (todos em main/GitHub)
- `0369ef2` — fix: reconstruir +55 ao gravar telefone do Asaas no Brevo
- `145e1f1` — fix: mínimo da doação avulsa = R$5,00 (limite do Asaas)
- `fddafd2` — feat: recibo instantâneo via transacional + n8n direto (sai da automação Brevo)

---

## ✅ ENTREGA 1 — Telefone: Asaas sem +55, Brevo/n8n com +55 (`0369ef2`)
**Problema:** o cliente apontou que o Asaas não preenche o telefone com o `+55`
(quer só DDD+número). A sessão anterior criou `toAsaasMobilePhone` (tira o +55 na
ida ao Asaas). MAS isso quebrou o WhatsApp: o **webhook lê o telefone DO Asaas**
(`customer.mobilePhone`, agora sem 55) e gravava no Brevo sem 55 → o n8n montava
um WhatsApp ID inválido (`+19986...`) → Manychat rejeitava.

**Correção:** nova `fromAsaasMobilePhone()` em `lib/phone.ts` reconstrói o E.164
(+55) ao ler o telefone do Asaas no `webhook.service.ts`, antes do upsert no Brevo.
- Asaas recebe/guarda o **nacional** (sem 55): ex. `19986031086`.
- Brevo/Manychat recebem o **E.164** (com +55): ex. `+5519986031086`.
- A função trata os dois casos (com ou sem 55) sem duplicar.

⚠️ **Pegadinha do `findOrCreateCustomer`:** ele REUSA o cliente por e-mail e **não
atualiza** dados de um cliente já existente. Clientes antigos (criados antes do fix)
mantêm o telefone velho no Asaas. Em produção (base limpa) não importa; e o webhook
normaliza pro Brevo de qualquer forma.

## ✅ ENTREGA 2 — Mínimo da avulsa = R$5,00 (`145e1f1`)
**Bug pego pelo Sentry em prod:** doação avulsa abaixo de R$5 estourava **500**.
O Asaas exige **mínimo R$5,00** para `billingType: UNDEFINED` ("Pergunte ao
Cliente", que mostra PIX+cartão). Nosso mínimo era R$1,00 → doações de R$1-4,99
passavam na validação e quebravam no Asaas.
**Correção:** `MIN_AVULSA` 100→500 (back, `lib/money.ts`) e `MIN_CENTS.avulsa`
100→500 (front, `lib/donation.ts`). UI mostra "mínimo R$5,00" dinamicamente.
Front foi rebuildado + `firebase deploy`.
> O Sentry pagou o próprio custo: apontou a causa exata (corpo do erro Asaas) em segundos.

## ✅ ENTREGA 3 — Recibo INSTANTÂNEO: transacional + n8n direto (`fddafd2`) ⭐
**O problema central da sessão.** A automação de marketing do Brevo (gatilho de
evento `doacao_confirmada`) tinha **11–26 min de latência** e disparava de forma
**instável** — comprovado com os logs de envio (CSV): evento aceito (204) mas o
e-mail só saía 11-26 min depois, e às vezes o contato travava no "Ponto de início"
(re-entrada bloqueada). Para recibo de doação isso é inaceitável.

**Diagnóstico (com fontes oficiais Brevo):** e-mail **transacional** e **automação**
usam caminhos de envio diferentes; o transacional é instantâneo e separado do
marketing. A própria Brevo recomenda transacional para mensagens críticas.

**Solução implementada:** o backend dispara o recibo DIRETO no `PAYMENT_CONFIRMED`:
- `sendReceiptEmail()` (`integrations/brevo.ts`): `POST /v3/smtp/email` com
  `templateId` + `params` (`{{ params.NOME/VALOR/TIPO/LINK_CANCELAMENTO }}`).
  **Template transacional id = 7** (criado/ativado no Brevo; tem que estar ATIVO,
  senão dá erro "template is disabled").
- `sendWhatsAppReceipt()` (`integrations/n8n.ts`, novo): chama o webhook do n8n
  direto, payload `{ body: { email, attributes } }` (o n8n recebe como `body.body`).
- `webhook.service.ts`: usa os dois; `linkCancelamento` exportado do donor.service
  p/ montar o LINK_CANCELAMENTO do recibo recorrente.
- Novas envs (Coolify + .env): `BREVO_RECEIPT_TEMPLATE_ID=7`,
  `N8N_WEBHOOK_URL=https://n8n.fastdevdigital.com.br/webhook/doacao-recibo`.
- 91 testes verdes.

**VALIDADO AO VIVO:** doação real → e-mail transacional **entregue em ~1 segundo**
(vs. 11-26 min). Telefone gravado certo (Asaas sem 55, Brevo `+5519986031086`).

⚠️ **DESATIVAR o e-mail na automação de marketing do Brevo** (senão sai recibo
DUPLICADO: o transacional + o da automação). O backend agora faz tudo; a automação
de marketing sai do caminho crítico.

## ✅ ENTREGA 4 — Reenvio recorrente VALIDADO
Cada débito mensal do Asaas gera um `PAYMENT_CONFIRMED` com `subscription`
preenchido → o backend redispara o recibo. Testado simulando 2 renovações da mesma
assinatura: **2 recibos entregues** (1s cada), `DATA_ULTIMA`/`VALOR_ULTIMA`
atualizando, `LINK_CANCELAMENTO` no e-mail. Usuário confirmou recebimento.
**O mantenedor recebe recibo TODO mês ao ser debitado.**

---

## 🔴 WHATSAPP — investigação exaustiva; diagnóstico = INFRA, não código

O fluxo de WhatsApp (Brevo→/agora backend→ n8n → Manychat → template) foi montado e
o **código está correto**, mas a **entrega não funciona** por limitações do Manychat/Meta.
Resumo do que descobrimos (para não repetir a investigação):

### Limitação 1 — `findBySystemField` por telefone NÃO acha subscribers de API
A API do Manychat guarda o número em `whatsapp_phone` (WhatsApp ID), mas o
`findBySystemField?phone=` busca no campo de sistema `phone`, que fica **vazio**
em subscribers criados via API. Retorna `data: []` mesmo o contato existindo.
**Solução adotada:** custom field **`wa_id`** (id `14736593`, tipo texto) +
`findByCustomField`. O n8n: busca por `wa_id` → se não acha, cria → seta `wa_id`
(p/ achar da próxima vez) → envia. **Validado** com número limpo (cria+seta+acha OK).
⚠️ O `wa_id` deve ser salvo e buscado no MESMO formato (decidido: COM `+`, E.164).
⚠️ Bug a corrigir no n8n: o campo `field_value` da busca tinha um `\n` no fim —
remover (`={{ $json.body.body.attributes.WHATSAPP_NUM }}` sem quebra de linha).

### Limitação 2 — A ENTREGA em si falha: "Message is failed to send"
Mesmo com subscriber ativo, opt-in, dentro da janela 24h, **com saldo na carteira**,
e `sendFlow`/`sendContent` retornando `{"status":"success"}`, a mensagem **NÃO chega**
— nem template, nem texto simples, nem para outro número. O painel do Manychat mostra
**"Message is failed to send, please contact Manychat Support"**.
**Causa (comunidade Manychat):** **permissões do canal WhatsApp expiradas/caídas** —
"refreshing your permissions usually resolves the issue". Explica "ontem chegou, hoje
não" sem mudança de código.
**Ação pendente (no painel, não-código):** Manychat → Configurações → WhatsApp →
**renovar permissões / reconectar o canal**; se persistir, **abrir ticket no suporte
do Manychat**.

### Limitação 3 (de fundo) — número de TESTE da Meta
O número usado é provavelmente o de **teste** da Meta (`+1 555…`), que só entrega
para até 5 destinatários cadastrados na whitelist. Para produção real é preciso um
**número WhatsApp Business verificado** na Meta. (Não confundir com o limite de
volume 250/24h — são coisas diferentes; o bloqueio NÃO é volume.)

### Conclusão do WhatsApp
**O código (backend + n8n + template) está pronto e correto.** O WhatsApp não
entrega por (a) conexão do canal Manychat e (b) número de teste. Ambos são
config/infra externa — quando resolvidos, o WhatsApp funciona **sem mexer no código**.
O **e-mail já cobre o recibo** de forma confiável e instantânea; não travar o
lançamento pelo WhatsApp.

---

## Estado do número de teste do usuário (gabrielgasparotto45 / 5519986031086)
Ficou **poluído** de tanto criar/deletar: subscriber `1442412696` está `deleted`
(irrecuperável via API). Ao mandar "ola" no bot, criou um novo `631074973` (active,
opt-in) — mas a entrega falha pelo problema do canal (Limitação 2). Para testar com
ele, precisa do canal reconectado. Alternativa: testar com número limpo + na whitelist.

## n8n — fluxo atual (resumo)
Webhook (`/webhook/doacao-recibo`) → Buscar `wa_id` (findByCustomField) → IF achou?
→ [existente: pega id] OU [cria → seta wa_id → id novo] → sendFlow (flow_ns
`content20260629220249_928344` = template recibo). Credenciais embutidas no JSON
(Manychat key, Brevo key) — **rotacionar em produção**.

## 🔴 PENDÊNCIAS
1. **Desativar o e-mail na automação de marketing do Brevo** (evitar recibo duplicado).
2. **WhatsApp:** reconectar o canal no Manychat (renovar permissões / ticket suporte)
   + providenciar **número de produção verificado** na Meta.
3. **Corrigir o `\n`** no `field_value` da busca do n8n.
4. **Rotacionar segredos** expostos no chat/JSON: `ASAAS_WEBHOOK_TOKEN`,
   `BREVO_API_KEY`, `BILLING_LINK_SECRET`, **Manychat API Key**.
5. **Produção Asaas:** `ASAAS_API_KEY` de produção (base64 em `ASAAS_API_KEY_B64`),
   `ASAAS_BASE_URL=https://api.asaas.com/v3`, recadastrar webhook no painel de produção.
6. **Caso de borda (discutido, não implementado):** mantenedor que cancela e depois
   faz avulsa fica com `TIPO=recorrente`/`STATUS=inativo` e `LINK_CANCELAMENTO` de
   assinatura morta. Refinar (mudar TIPO no cancelamento ou checar STATUS no template)
   — decisão de produto pendente.
7. Ver `docs/roteiro-de-testes-pre-producao.md` (checklist completo pré-produção).

## Notas de ambiente
- Repo em `hospedandoAnjos/` (sempre `cd` antes de git). Push exige credencial
  GitHub válida (deu 401 nesta sessão; usuário fez o push manualmente).
- Front muda → `npm run build` + `firebase deploy`. Back muda → push (Coolify auto).
- E-mail transacional rastreável em `GET /v3/smtp/statistics/events?email=...`.
- Para limpar/testar do zero: deletar subscriptions→customers no Asaas, contatos no
  Brevo (preservar "Welcome Bot" de sistema). Manychat não deleta subscriber via API.

## Skills sugeridas p/ a próxima sessão
- **`verify`** — quando o canal WhatsApp for reconectado, validar o fluxo real.
- **`triage`** — fechar issues no GitHub após produção.
