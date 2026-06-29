# Handoff — Telefone no Asaas, Sentry no backend e transparência ao doador

Data: 2026-06-28

## Tipo desta sessão
Sessão de **ajustes pós-deploy** (sistema já no ar — ver
`handoff-deploy-coolify-firebase-e-automacao-brevo.md`). Três entregas de código
+ planejamento de duas tasks que dependem de terceiros (Meta/stakeholders).
Todos os commits estão em `main` no GitHub. Backend redeploya sozinho no Coolify;
frontend foi buildado e `firebase deploy` feito nesta sessão.

## Fontes da verdade (ler primeiro)
- [ADR-0005](adr/0005-migracao-stripe-para-asaas.md) — migração Asaas.
- [ADR-0004](adr/0004-mensageria-brevo-n8n-manychat-desde-o-inicio.md) — mensageria.
- [handoff-deploy-coolify-firebase-e-automacao-brevo](handoff-deploy-coolify-firebase-e-automacao-brevo.md) — sessão anterior (deploy ao vivo).
- [handoff-brevo-recibo-e-automacao](handoff-brevo-recibo-e-automacao.md) — recibo/automação Brevo, atributos do contato.

---

## ✅ O que foi CONCLUÍDO nesta sessão

### 1. Telefone no checkout do Asaas — sem `+55` (commit `5002526`)
- **Problema (apontado pelo cliente):** o Asaas (gateway BR) preenche o campo de
  telefone na página hospedada a partir do número **nacional** (DDD + número),
  sem o código de país. O backend mandava E.164 (`+5511999998888`) e o Asaas
  **não preenchia**.
- **Correção:** novo helper `toAsaasMobilePhone()` em `backend/src/lib/phone.ts`
  extrai o número nacional via `libphonenumber-js` (ex.: `+5511999998888` ->
  `11999998888`). Usado **só na ida ao Asaas** (`integrations/asaas.ts`).
- **Importante:** o E.164 completo (com `+55`) **continua** sendo guardado no
  Brevo em `WHATSAPP_NUM` — é o que o Manychat usa. Só o Asaas recebe o nacional.
- 3 testes novos; `tsc` limpo; **85 testes verdes**.

### 2. Sentry no backend (commit `077495f`) — VALIDADO EM PROD
- `@sentry/node` instrumentando o Express. `backend/src/instrument.ts` inicializa
  o Sentry e é importado **primeiro** no `server.ts`;
  `Sentry.setupExpressErrorHandler(app)` no `app.ts` (antes do nosso errorHandler).
- **No-op sem `SENTRY_DSN`**: dev local e testes rodam sem credencial. Em produção,
  basta setar a env. `SENTRY_DSN` adicionado ao `config/env.ts` e `.env.example`.
- **Config feita nesta sessão:** `SENTRY_DSN` setado no **Coolify** (DSN região
  `.de.`, projeto `fatec-campinas`). DSN não tem `$` -> não precisa de base64.
- **O que o Sentry captura:** só exceções não tratadas que viram **500** (falhas
  reais — ex.: webhook não consegue falar com Asaas/Brevo). **NÃO** captura 4xx
  (400 de validação, 401 de token errado) — isso é o sistema funcionando, não bug.
  Se quiser capturar falha silenciosa sem derrubar a request, usar
  `Sentry.captureException(e)` no ponto específico (não feito; só os 500 por ora).
- **Validação em prod (passou):** forçado um 500 real batendo no webhook com token
  válido + `customer` inexistente (`getCustomer` estoura) -> apareceu como Issue no
  painel do Sentry. Monitoramento 100% funcionando.
- Sugestão deixada ao usuário: ligar **alertas por e-mail** em Settings -> Alerts.

### 3. Transparência de suporte ao doador no frontend (commit `237324d`) — DEPLOYADO
- **Novo `frontend/src/lib/contato.ts`:** fonte única dos canais oficiais —
  e-mail `contato@prismabrasil.com.br`, Instagram `@prismabrasil`, **WhatsApp
  oficial `(19) 98314-9844`** (`wa.me/5519983149844`). Pra trocar um canal,
  altera só aqui.
- **FAQ** (`components/sections/Faq.tsx`): nova pergunta **"Tive um problema com a
  doação. Com quem falo?"** listando Instagram + e-mail + WhatsApp.
- **Rodapé** (`components/sections/Rodape.tsx`): contatos viraram **links
  clicáveis** (mailto / instagram / wa.me). Saiu o comentário "PLACEHOLDER".
- **Mensagens de erro** agora apontam pros canais reais (antes era "fale conosco"
  genérico): `pages/CancelarPage.tsx` (erro de cancelamento) e
  `components/sections/BlocoDoacao.tsx` (erro ao iniciar pagamento).
- `tsc` limpo. Frontend sem suíte de testes (não há `*.test`). **Buildado +
  `firebase deploy` feito** — confirmado `5519983149844` e `api-anjos` (não
  localhost) no bundle. No ar em `anjos.prismabrasil.com.br` / `hospedando-anjos.web.app`.

---

## 🔎 Reenvio de e-mail no recorrente — JÁ COBERTO POR CÓDIGO (falta só verificar)
- O usuário pediu "testar reenvio no recorrente". **Não precisou de código.**
- `services/webhook.service.ts` (case `PAYMENT_CONFIRMED`) dispara
  `sendDonationEvent` em **TODA** doação confirmada — avulsa, recorrente **e
  renovação**. Não há filtro de "primeira fatura" (a ADR-0005 removeu isso de
  propósito). Toda renovação mensal do Asaas gera um novo `PAYMENT_CONFIRMED` com
  `payment.subscription` preenchido -> `isRecorrente = true` -> recibo reenviado.
- **Falta (não-código):** provar no sandbox. Antecipar/pagar a 2ª cobrança da
  assinatura no painel Asaas, OU simular o webhook (curl abaixo, com token real e
  um `customer` + `subscription` que existam no sandbox):
  ```
  curl -X POST https://api-anjos.fastdevdigital.com.br/webhooks/asaas \
    -H "Content-Type: application/json" \
    -H "asaas-access-token: <TOKEN>" \
    -d '{"event":"PAYMENT_CONFIRMED","payment":{"customer":"cus_REAL","value":20,"subscription":"sub_REAL"}}'
  ```

---

## ⏳ ManyChat / n8n — DECISÃO DE PRODUTO PENDENTE (stakeholders)
Objetivo do cliente: **recibo por WhatsApp** (eles querem muito).

### Bloqueio real (não é código): regras da Meta para WhatsApp
1. **Número de produção verificado.** O número atual no Manychat é `+1 555…` (de
   TESTE — só envia para ~5 números cadastrados na mão, **não** para o público).
   Precisa de um número BR no WhatsApp Business Platform, com o Meta Business da
   Prisma verificado (documentos). **É o item que mais demora.**
2. **Message Template aprovado pela Meta.** Para enviar a quem nunca conversou,
   só via template aprovado. O usuário **criou** o template `recibo_doacao`
   (categoria UTILITY, pt_BR, sem botão dinâmico) e submeteu — aguardando
   aprovação (horas a ~2 dias).

### Estado do nosso lado (pronto, sem depender da Meta)
- Backend já dispara o evento `doacao_confirmada` em toda doação.
- **Workflow do n8n montado** (JSON entregue ao usuário no chat — não está no
  repo): Webhook (entrada do Brevo) -> HTTP GET no Brevo p/ buscar o contato
  (`WHATSAPP_NUM`, `NOME`, `VALOR_ULTIMA`) -> HTTP Manychat createSubscriber ->
  HTTP Manychat sendContent com o template. Faltam credenciais (Manychat API Key)
  e ajuste do caminho do e-mail no payload do Brevo (ver no Executions).
- ⚠️ **Ler o número de `WHATSAPP_NUM`, NUNCA `WHATSAPP`** (atributo reservado).
- ⚠️ WhatsApp por API oficial **nunca** chega como bolha de voz; mídia via media_id.

### Fallback proposto (recomendado para destravar o lançamento)
Se o template/numero demorar: o n8n **só cria o subscriber no Manychat** (não
depende de template nem de janela 24h) e o **recibo segue por e-mail** (já 100%).
Quando número+template estiverem prontos, **religa o último nó** do n8n — sem
retrabalho. O usuário vai **confirmar com os stakeholders** qual caminho seguir.

**Perguntas abertas p/ os stakeholders:**
1. Recibo por WhatsApp é requisito de lançamento, ou e-mail basta no go-live?
2. Existe número WhatsApp Business de produção (BR) + Meta Business verificado?
3. Quem aprova o texto do template?

---

## 🔴 PENDÊNCIAS / SEGURANÇA
1. **Rotacionar o `ASAAS_WEBHOOK_TOKEN`** — apareceu no chat durante o teste do
   Sentry (valor lido do `.env` para forçar o 500). Gerar novo authToken no webhook
   do Asaas + atualizar no Coolify + redeploy. (Soma-se às rotações já pendentes do
   handoff anterior: `BREVO_API_KEY`, `BILLING_LINK_SECRET`.)
2. **Verificar o reenvio recorrente** no sandbox (seção acima).
3. **ManyChat/n8n**: aguardando decisão dos stakeholders + aprovação Meta.
4. **Sentry**: (opcional) ligar alertas por e-mail; (opcional) `captureException`
   em pontos de falha silenciosa (ex.: envio ao Brevo) se quiser cobertura além dos 500.
5. **FAQ ainda é placeholder** (`Faq.tsx` linha de comentário): as respostas das
   outras perguntas precisam de validação do cliente. A de suporte já está com
   dados reais.
6. **Teste em prod (Asaas real):** previsto para segunda. Continua em **sandbox**
   por ora (cliente vai testar em sandbox antes). Para produção real: gerar
   `ASAAS_API_KEY` de produção (base64 na env `ASAAS_API_KEY_B64` do Coolify),
   `ASAAS_BASE_URL=https://api.asaas.com/v3`, e recadastrar o webhook no painel de
   produção (ver handoff anterior).

## Notas de ambiente
- Repo git em `hospedandoAnjos/` (remote `fast-dev-digital/hospedandoAnjos`).
  **Sempre `cd hospedandoAnjos` antes de git** (a pasta pai é outro repo acidental).
- **Frontend muda -> precisa `npm run build` + `firebase deploy`** (Vite embute as
  vars no build). Backend muda -> só push (Coolify auto-deploy). Confirmar o bundle
  com `grep` em `dist/assets/*.js`.
- Mudar `.env` exige reiniciar o backend (`tsx watch` não observa `.env`).
- Windows; warnings LF->CRLF normais.

## Skills sugeridas p/ a próxima sessão
- **`verify`** — provar o reenvio recorrente no sandbox quando for testar.
- **`triage`** — fechar issues no GitHub após verificações.
