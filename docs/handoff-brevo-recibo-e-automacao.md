# Handoff — Montar o recibo e a automação no Brevo/n8n/Manychat

## Tipo desta sessão
Verificação ponta-a-ponta da migração Asaas no **sandbox** (checkout avulso +
recorrente + cancelamento, todos validados com pagamento real) e **correção de um
bug crítico no Brevo**. Este doc é o guia operacional para o usuário montar, no
painel do Brevo, **o recibo (e-mail/WhatsApp) e a automação** que dispara o
agradecimento. É config de plataforma — não tem código novo aqui.

## Fontes da verdade (ler primeiro)
- [ADR-0005](adr/0005-migracao-stripe-para-asaas.md) — a spec da migração.
- [ADR-0004](adr/0004-mensageria-brevo-n8n-manychat-desde-o-inicio.md) — por que
  Brevo + n8n + Manychat (e não só Brevo).
- `CONTEXT.md` — tabela de atributos do contato no Brevo (os dois grupos).
- Handoffs anteriores de migração (`handoff-migracao-asaas-issues-*`).

---

## ✅ O que foi VERIFICADO nesta sessão (sandbox, com pagamento real)
- **Webhook Asaas** criado via API (id `239c0212-…`), token batendo com o `.env`.
- **Avulso** → lead criado no Brevo: `VALOR_ULTIMA=5` (R$5). Confirma que
  `payment.value` do Asaas vem em **reais decimais**, não centavos. (Ponto que
  estava aberto no handoff anterior — agora FECHADO.)
- **Recorrente** → lead com grupo mantenedor completo: `TIPO=recorrente`,
  `STATUS=ativo`, `VALOR=20`, `ASAAS_SUBSCRIPTION_ID`, `LINK_CANCELAMENTO`,
  `DATA_PRIMEIRA_DOACAO`.
- **Cancelamento** (clicando o `LINK_CANCELAMENTO`) → assinatura `deleted/INACTIVE`
  no Asaas **e** `STATUS=inativo` no Brevo (via `SUBSCRIPTION_DELETED`).

## 🐞 Bug crítico corrigido nesta sessão (NÃO reverter)
- **`WHATSAPP` é atributo RESERVADO do Brevo.** Gravá-lo via `attributes` ao
  **criar** um contato novo retorna `404 document_not_found` em vez de criar →
  **todo 1º pagamento de doador novo falhava** (avulso e recorrente). O avulso só
  "passou" no 1º teste por o contato já existir (caiu em update, não create).
- **Correção:** número agora vai no atributo **custom `WHATSAPP_NUM`** (type text).
  Criado na conta Brevo via API. Código: `donor.service.ts` grava `WHATSAPP_NUM`.
  9+10 testes verdes, `tsc` limpo. Doc: `CONTEXT.md` atualizado.
- **Impacto na automação:** ler o número de **`WHATSAPP_NUM`**, NUNCA de `WHATSAPP`.
- **Mudança auxiliar:** `GET /cancelar` agora responde **JSON**
  (`{ ok, message }`) em vez de texto, p/ a futura página `/cancelar` do frontend.

## ✅ Recibo: evento implementado e commitado nesta sessão
- Commit `feat: disparar evento doacao_confirmada no Brevo a cada doação` (pushed).
- `brevo.ts` ganhou `sendDonationEvent()` (POST /v3/events) e o `webhook.service.ts`
  dispara no `PAYMENT_CONFIRMED`. Verificado em sandbox: lead criado + evento aceito
  (204) + visível no histórico do contato. Ver a seção "DECISÃO FINAL" abaixo.
- **Falta (não-código):** montar a automação no Brevo com o gatilho de evento +
  o template (textos prontos abaixo). Depende da indexação do evento pelo Brevo.

---

## Atributos do contato no Brevo (nomes EXATOS p/ usar como variável)

> No Brevo, a variável no template é `{{ contact.ATRIBUTO }}` (confira a sintaxe da
> sua conta; algumas usam `{{params.X}}` em transacional). Os NOMES abaixo são os
> que o backend grava — use-os exatamente.

**Sempre presentes:**
| Atributo | Conteúdo | Exemplo |
|---|---|---|
| `NOME` | nome completo do doador | `Maria Silva` |
| `WHATSAPP_NUM` | telefone E.164 (com +55) | `+5511999998888` |
| (EMAIL é a chave do contato) | | `maria@…` |

**Grupo "última doação" — muda a CADA doação (avulsa ou recorrente):**
| Atributo | Conteúdo | Exemplo |
|---|---|---|
| `VALOR_ULTIMA` | valor da última doação, **em reais** | `20` |
| `DATA_ULTIMA` | data ISO da última doação — **É O GATILHO** | `2026-06-25T22:31:12Z` |
| `TIPO_ULTIMA` | `avulsa` ou `recorrente` | `recorrente` |

**Grupo "mantenedora" — só doação RECORRENTE altera (avulsa nunca rebaixa):**
| Atributo | Conteúdo | Exemplo |
|---|---|---|
| `TIPO` | `recorrente` (vínculo de mantenedor) | `recorrente` |
| `STATUS` | `ativo` / `falha_pagamento` / `inativo` | `ativo` |
| `VALOR` | mensalidade em reais | `20` |
| `ASAAS_SUBSCRIPTION_ID` | id da assinatura | `sub_xxx` |
| `DATA_PRIMEIRA_DOACAO` | data ISO da 1ª doação | `2026-…` |
| `LINK_CANCELAMENTO` | URL pronta p/ cancelar (backend gera) | `https://api…/cancelar?t=…` |

⚠️ `VALOR`/`VALOR_ULTIMA` já vêm **em reais** (ex.: `20`), prontos p/ exibir —
NÃO dividir por 100.

---

## O GATILHO da automação: o campo `DATA_ULTIMA` mudou

Toda doação (primeira ou repetida, avulsa ou recorrente) o backend regrava
`DATA_ULTIMA`. **Esse é o sinal** para mandar o agradecimento. No Brevo monta-se
uma automação com gatilho **"um atributo do contato foi atualizado" → `DATA_ULTIMA`**.

Transições de `STATUS` (mantenedora), úteis p/ outras automações:
- `PAYMENT_CONFIRMED` (recorrente) → `STATUS = ativo`
- `PAYMENT_OVERDUE` → `STATUS = falha_pagamento`  ← gancho p/ "atualize seu cartão"
- `SUBSCRIPTION_DELETED` → `STATUS = inativo`       ← gancho p/ retenção/win-back

---

## ⭐ DECISÃO FINAL: gatilho do recibo = EVENTO `doacao_confirmada`

> **Por que NÃO foi "atributo atualizado":** o Brevo **não tem** gatilho de automação
> "um atributo mudou". E **"Contato adicionado a uma lista"** só dispara na **1ª vez**
> (não nas renovações mensais). Como o requisito é mandar recibo em **TODA** doação
> (avulsa, recorrente E renovação), a única forma que cobre isso é um **evento**.

**O backend já dispara o evento** (commit `feat: disparar evento doacao_confirmada`).
Em todo `PAYMENT_CONFIRMED`, chama `POST /v3/events` do Brevo:
- `event_name: doacao_confirmada`
- `identifiers.email_id`: e-mail do doador
- `event_properties`: `NOME`, `VALOR`, `TIPO` (avulsa/recorrente)

> ⚠️ Usa a **API moderna `/v3/events`** com a **`BREVO_API_KEY` normal** — **NÃO** a
> `ma-key` do `trackEvent` legado (essa some no painel novo e não vale a pena). Não
> precisa de chave nova nenhuma. Verificado: `/v3/events` responde **204** e o evento
> aparece no histórico do contato (Contatos → contato → Visão geral / atividade).

### Passo a passo no Brevo
1. **Atributos** (Contatos → Configurações → Atributos): confirmar que existem
   `NOME, WHATSAPP_NUM, VALOR_ULTIMA, DATA_ULTIMA, TIPO_ULTIMA, TIPO, STATUS, VALOR,
   ASAAS_SUBSCRIPTION_ID, DATA_PRIMEIRA_DOACAO, LINK_CANCELAMENTO`.
   ⚠️ atributo inexistente é **ignorado em silêncio** no upsert — crie antes.
2. **Template do recibo** (e-mail e/ou Manychat — ver textos prontos abaixo).
3. **Automação** (Automações → criar workflow):
   - **Gatilho de ENTRADA** (1ª etapa): **"Evento personalizado"** → selecionar
     **`doacao_confirmada`**. ⚠️ tem que ser o **gatilho**, não uma etapa #3 no meio.
   - Ação: enviar o e-mail (template) e/ou chamar o n8n/Manychat p/ o WhatsApp.

### ⏳ Pegadinha conhecida: DELAY de indexação do evento
O `doacao_confirmada` **só aparece como opção no gatilho depois que o Brevo indexa** o
evento. **O evento chegando no histórico do contato NÃO é o mesmo que ele estar
disponível no gatilho.** Se o dropdown do gatilho estiver vazio: **não é bug** — o
backend está disparando certo (confirmado no histórico do contato); é só esperar.

**Tempo esperado (não há prazo oficial do Brevo; dados da comunidade):**
- A **1ª indexação de um tipo de evento novo é lenta**: de horas a **~2-3 dias**
  (relato: "deixei no fim de semana, na segunda apareceu").
- Depois que o tipo é registrado, **novos disparos aparecem imediatamente**.
- **Não dá p/ acelerar** — a resolução é passiva (esperar); disparar mais vezes não
  comprovadamente ajuda. Já disparamos `doacao_confirmada` várias vezes em 2026-06-25,
  então o relógio da 1ª indexação já está correndo.
- **Decisão (2026-06-25):** esperar a indexação (não migrar p/ o plano B do n8n agora).

### Alternativa se a indexação demorar demais (plano B)
Se o gatilho de evento nunca aparecer / for inviável, o caminho do **ADR-0004** resolve
sem depender disso: **backend chama um webhook do n8n** no `PAYMENT_CONFIRMED`, e o n8n
manda o recibo pelo Manychat. Dispara em toda doação, sem `ma-key`, sem delay. (Não
implementado — só virar a chave se necessário.)
⚠️ **WhatsApp por API oficial nunca chega como bolha de voz/PTT** — áudio sempre vira
player de música; enviar mídia via media_id, não link do Drive. (Para texto não importa.)

---

## 📧 Template do RECIBO — E-MAIL (Brevo)

**Assunto:** `Recebemos sua doação 💛`

**Corpo (HTML — colar no editor de código do template):**
```html
<p>Olá, {{ contact.NOME | default : "amigo(a)" }}! 💛</p>

<p>Recebemos sua doação de <strong>R$ {{ contact.VALOR_ULTIMA }}</strong> e
queremos te agradecer de coração. Cada contribuição ajuda o
<strong>Hospedando Anjos</strong> a acolher quem mais precisa.</p>

{% if contact.TIPO == "recorrente" %}
<p>Você é um dos nossos <strong>mantenedores mensais</strong> — obrigado por esse
apoio contínuo! 🙏</p>
<p style="font-size:13px;color:#888">
  Se precisar cancelar sua doação recorrente a qualquer momento, é só clicar aqui:
  <a href="{{ contact.LINK_CANCELAMENTO }}">cancelar minha doação</a>.
</p>
{% endif %}

<p>Com gratidão,<br>Equipe Hospedando Anjos</p>
```

## 💬 Template do RECIBO — WHATSAPP (Manychat / texto puro, sem HTML)

```
Olá, {{ contact.NOME }}! 💛

Recebemos sua doação de R$ {{ contact.VALOR_ULTIMA }} e queremos te agradecer de coração. Cada contribuição ajuda o Hospedando Anjos a acolher quem mais precisa. 🙏
{% if contact.TIPO == "recorrente" %}

Você é um dos nossos mantenedores mensais — obrigado pelo apoio contínuo!
Para cancelar quando quiser: {{ contact.LINK_CANCELAMENTO }}
{% endif %}

Com gratidão,
Equipe Hospedando Anjos
```

> **Sintaxe:** Brevo usa `{{ contact.ATRIBUTO }}` e blocos condicionais
> `{% if contact.TIPO == "recorrente" %} … {% endif %}` (Brevo Template Language).
> O `{% if %}` mostra o link de cancelamento **só p/ mantenedor** — assim UMA mensagem
> serve avulso e recorrente. Se o texto do WhatsApp for montado **no n8n** antes do
> Manychat, fazer o `if` no n8n (nó IF/Set), pois o Manychat pode não aceitar `{% %}`.
> Variáveis do EVENTO (`NOME`, `VALOR`, `TIPO`) também ficam disponíveis na automação;
> as do CONTATO (`{{contact.LINK_CANCELAMENTO}}`, `{{contact.VALOR_ULTIMA}}`) sempre.

---

## Ramificação recomendada do recibo (por tipo)

| Caso (`TIPO_ULTIMA`) | Mensagem | Inclui `{{LINK_CANCELAMENTO}}`? |
|---|---|---|
| `avulsa` (contato novo ou avulso) | "Obrigado pela sua doação de R$ {{VALOR_ULTIMA}}!" | ❌ não (não há assinatura) |
| `recorrente` | agradecimento + recibo mensal | ✅ sim |
| `avulsa` MAS o contato é mantenedor (`TIPO=recorrente`) | doação extra de um mantenedor | opcional — ele TEM link válido; ramificar por `TIPO` (status) se quiser mostrar |

> O caso da 3ª linha foi discutido nesta sessão: um recorrente que faz uma avulsa
> **não é rebaixado** (o backend não toca a mantenedora), então `LINK_CANCELAMENTO`
> continua válido no contato mesmo a última doação sendo avulsa.

---

## ⚠️ Pendências que NÃO são do Brevo (mas afetam o recibo)
1. **`API_BASE_URL` em produção.** Hoje o `.env` aponta `http://localhost:3000`,
   então o `LINK_CANCELAMENTO` gravado no Brevo abre localhost — **inútil p/ o
   doador**. Trocar p/ o domínio público do backend ANTES de ir ao ar. (Recriar/
   regravar os contatos de teste, ou só valer p/ doações novas.)
2. **Asaas em produção:** trocar `ASAAS_API_KEY` (hoje `aact_hmlg_`/sandbox) e
   `ASAAS_BASE_URL` p/ produção; **recadastrar o webhook** no painel de produção
   apontando p/ o domínio real (a URL ngrok desta sessão é temporária).
3. **Página `/cancelar` no frontend** (task já passada ao time): consome o JSON do
   `GET /cancelar?t=…` e mostra a mensagem. Não recebe dados do doador.
4. **Limpar leads de teste** no Brevo: `teste.anjos.qa@…`, `mantenedor2.anjos.qa@…`
   e os `n…/fix…/bisect…@example.com` criados no diagnóstico do bug.

## Estado do código (não commitado no momento deste handoff)
- `donor.service.ts` → `WHATSAPP_NUM`.
- `billing.controller.ts` → resposta JSON em `/cancelar`.
- `donor.service.test.ts` / `brevo.ts` (comentário) / `CONTEXT.md` → ajustados.
- Atributo `WHATSAPP_NUM` criado na conta Brevo (via API).
