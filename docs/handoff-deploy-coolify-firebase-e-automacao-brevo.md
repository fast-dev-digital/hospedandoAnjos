# Handoff — Deploy (backend Coolify + front Firebase) e automação Brevo ao vivo

Data: 2026-06-28

## Tipo desta sessão
Colocar o sistema **no ar** e validar o fluxo ponta-a-ponta em **produção (ainda
apontando p/ Asaas sandbox)**: montar a automação do recibo no Brevo, fazer o
deploy do backend no Coolify e do frontend no Firebase Hosting, e destravar uma
sequência de bugs de **configuração de deploy** (nenhum bug de lógica de negócio).
Resultado: **fluxo completo funcionando** — checkout → pagamento → Brevo → recibo
→ cancelamento → baixa no CRM, tudo automático.

## Fontes da verdade (ler primeiro)
- [handoff-brevo-recibo-e-automacao](handoff-brevo-recibo-e-automacao.md) — a
  sessão anterior; explica o evento `doacao_confirmada` e os atributos do Brevo.
- [ADR-0005](adr/0005-migracao-stripe-para-asaas.md) — spec da migração Asaas.
- [ADR-0004](adr/0004-mensageria-brevo-n8n-manychat-desde-o-inicio.md) — mensageria.
- `frontend/FRONT-END-CONTEXT.md` — **decisão: front no Firebase, NÃO no Coolify.**

---

## ✅ O que foi CONCLUÍDO e VERIFICADO nesta sessão

### 1. Automação do recibo no Brevo (config de plataforma, sem código)
- O evento `doacao_confirmada` **indexou** (apareceu no gatilho — era a espera
  pendente do handoff anterior).
- Criado o **template de e-mail** (recibo) e a **automação** com gatilho de
  entrada = **Evento personalizado `doacao_confirmada`** → enviar e-mail.
- Template final: cabeçalho "Recibo de doação", tabela **Valor + Tipo**
  (Mensal/Avulsa via `{% if contact.TIPO == "recorrente" %}`), bloco de
  mantenedor com `{{ contact.LINK_CANCELAMENTO }}`, rodapé com **CNPJ
  46.275.615/0001-21** e **prismabrasil.oficial@gmail.com**.
- ⚠️ **Não usar o filtro `| date`** no template: `DATA_ULTIMA` é atributo do tipo
  *text* e o Brevo acusa "variáveis incorretas". A linha de Data foi REMOVIDA do
  template. Se quiser data no recibo, o backend deve gravar um atributo já
  formatado (Versão B, não feita).
- ⚠️ **Duas fontes de variável** na automação: propriedades do **EVENTO**
  (`NOME, VALOR, TIPO`) e atributos do **CONTATO** (`VALOR_ULTIMA,
  LINK_CANCELAMENTO, ...`). No template lê-se do contato via `{{ contact.X }}` —
  funciona mesmo o X não estando no evento.
- ⚠️ O **Assunto** do e-mail fica nas **Configurações da campanha** (não no editor
  de design). Sem ele, o "enviar teste" fica bloqueado.

### 2. Deploy SPLIT: backend → Coolify, frontend → Firebase
- **Decisão (registrada em FRONT-END-CONTEXT.md):** front no **Firebase Hosting**,
  back no **Coolify**. NÃO dockerizar o front (Dockerfile/nginx do front foram
  criados por engano e REMOVIDOS — commit `e5b826f`). O SPA fallback do front já
  é coberto pelos `rewrites` do `firebase.json` (`** -> /index.html`).
- **Backend (Coolify):**
  - `backend/Dockerfile` (multi-stage Node 22 alpine). **Build context = raiz do
    repo** (porque o tsconfig do backend tem `rootDir ".."` e compila
    `../shared`; o Dockerfile faz `COPY backend` + `COPY shared`).
  - ⚠️ **Base Directory no Coolify = `/`** (ou vazio), **não** `hospedandoAnjos`.
    O nível `hospedandoAnjos/` extra existe só no disco local; no GitHub a raiz já
    é `backend/ frontend/ shared/`. Dockerfile Location = `/backend/Dockerfile`.
  - `CMD ["node","dist/backend/src/server.js"]` — caminho com `dist/backend/src/`
    por causa do `rootDir ".."` (validado).
  - Domínio público: **`https://api-anjos.fastdevdigital.com.br`** (HTTPS auto do
    Coolify; DNS A apontando p/ o servidor).
  - Repo é **privado** → conexão via **GitHub App** do Coolify (não Deploy Key, e
    NÃO precisa de GitHub Actions — o auto-deploy é por webhook nativo do Coolify).
- **Frontend (Firebase):**
  - `frontend/.env`: `VITE_API_BASE_URL=https://api-anjos.fastdevdigital.com.br`.
  - ⚠️ Vite **embute** essa var **no `npm run build`** — trocar o `.env` exige
    **rebuild + `firebase deploy`**. Conferir no bundle com `grep api-anjos
    dist/assets/*.js` (e que `localhost` sumiu).
  - Projeto Firebase `hospedando-anjos`; domínio custom **`anjos.prismabrasil.com.br`**.

### 3. Fluxo ponta-a-ponta testado AO VIVO (produção, Asaas sandbox)
- Checkout no site → pagamento real no Asaas → `PAYMENT_CONFIRMED` no webhook →
  contato gravado no Brevo → evento `doacao_confirmada` → **recibo no e-mail**.
- Cancelamento → `SUBSCRIPTION_DELETED` → **`STATUS=inativo`** no Brevo + 0
  assinaturas ativas no Asaas. Tudo confirmado.

---

## 🐞 Bugs de DEPLOY resolvidos (NÃO reabrir)

### A. Coolify trunca env vars que contêm `$` (bug do Coolify, não nosso)
- A `ASAAS_API_KEY` tem **dois `$`** (`$aact_...::$aach_...`). O Coolify
  trunca/muta valores com `$` mesmo com "Literal" e mesmo escapando `$$`
  (issues coollabsio/coolify #1918, #3946, #4321). Sintoma: Asaas **401
  invalid_access_token**.
- **Solução no código** (commit `1d26ba2`): `backend/src/config/env.ts` aceita
  **`ASAAS_API_KEY_B64`** (base64, sem `$`) e decodifica no boot. Retrocompatível:
  sem a B64, usa `ASAAS_API_KEY` normal (dev local, onde o `.env` lida com `$`).
- **No Coolify:** criar a env **`ASAAS_API_KEY_B64`** (nome EXATO, maiúsculo, com
  `_B64` — nomes são case-sensitive e sem espaço!) com o base64 da chave.
  Gerar com: `printf '%s' "$CHAVE" | base64 -w0`.
- ⚠️ **A chave válida começa com `$`** (`$aact_hmlg_...`). Não remover o `$` do
  início — ele faz parte da chave.

### B. Base Directory errado no Coolify
- Erro `lstat .../hospedandoAnjos/backend: no such file or directory`. Causa:
  Base Directory estava `hospedandoAnjos`, mas a raiz do repo no GitHub já é
  `backend/...`. Correção: Base Directory = `/`. (ver seção 2)

### C. "Recarrega e volta pra home" ao clicar no link de cancelamento
- **NÃO era bug.** A página `/cancelar` existe e funciona (`CancelarPage.tsx`,
  `lib/cancel.ts`). O sintoma era do **build do Firebase desatualizado** (feito
  antes de trocar o `.env`, então tinha `localhost` embutido) + a necessidade de
  SPA fallback (já coberto pelo firebase.json). Rebuild + deploy + hard refresh
  resolveu.
- ⚠️ `lib/cancel.ts` e `lib/checkout.ts` caem em **MOCK** se `VITE_API_BASE_URL`
  estiver ausente — o mock finge sucesso (cancelamento falso-positivo). Por isso é
  crítico a var estar no build.

### D. CORS
- O backend libera só `env.FRONTEND_ORIGIN` (comparação exata). Valor correto:
  `https://anjos.prismabrasil.com.br` (**sem barra final**). Confirmado: preflight
  OPTIONS responde `Access-Control-Allow-Origin` certo. O "erro de CORS" que
  apareceu antes era na verdade o backend em **503** (deploy em andamento) — sem
  servidor, não há header, e o browser reporta como CORS.

### E. Webhook do Asaas apontando p/ ngrok morto
- O webhook (id `239c0212-...`) estava com `url` de um **ngrok antigo** e
  `interrupted=True` (Asaas desativou após falhas). Por isso pagava mas **nada
  chegava no Brevo**. Corrigido via API: `url=https://api-anjos.fastdevdigital.com.br/webhooks/asaas`,
  `enabled=true`, `interrupted=false`, `authToken=ASAAS_WEBHOOK_TOKEN`, events
  `[PAYMENT_CONFIRMED, PAYMENT_OVERDUE, SUBSCRIPTION_DELETED]`. Endpoint validado
  em prod: token errado→401, token certo→200.

---

## Estado do código (commits desta sessão, já no main/GitHub)
- `e41171f` — dockerfiles Coolify (depois o do front foi removido).
- `e5b826f` — remove dockerfiles do frontend (front é Firebase).
- `1d26ba2` — `env.ts` aceita `ASAAS_API_KEY_B64` (workaround bug do Coolify).

## Achado de ambiente (cuidado)
- O **repo git fica na subpasta `hospedandoAnjos/`** (remote
  `fast-dev-digital/hospedandoAnjos.git`). Rodar git da pasta pai sobe até
  `C:/Users/Gabriel`, que é OUTRO repo acidental (remote `pillarSaas.git`) com
  arquivos do sistema. **Sempre `cd hospedandoAnjos` antes de qualquer git.**

---

## ⚠️ PENDÊNCIAS para PRODUÇÃO REAL (Asaas de verdade)
1. **Asaas produção:** gerar `ASAAS_API_KEY` de produção (`aact_prod_...`),
   colocar **em base64** na env `ASAAS_API_KEY_B64` do Coolify, e
   `ASAAS_BASE_URL=https://api.asaas.com/v3`.
2. **Recadastrar o webhook** no painel de **produção** do Asaas (o atual é da
   conta sandbox) → URL `https://api-anjos.fastdevdigital.com.br/webhooks/asaas`,
   mesmo `authToken`, eventos `PAYMENT_CONFIRMED/PAYMENT_OVERDUE/SUBSCRIPTION_DELETED`.
3. **Rotacionar segredos** expostos no chat desta sessão: **BREVO_API_KEY** e
   **BILLING_LINK_SECRET** (gerar novos e revogar os antigos).
4. **Limpar leads/contatos de teste** no Brevo se quiser começar limpo.
5. (Opcional) Recibo com **data/nº de transação/método** = Versão B: backend grava
   atributos já formatados no `event_properties`/contato.

## Notas de segurança
- Segredos vivem **só no Coolify** (env runtime), nunca no repo (`.env` está no
  `.gitignore`). `ASAAS_API_KEY_B64` é só ofuscação contra o bug de `$`, **não**
  é criptografia — tratar como segredo normal.
