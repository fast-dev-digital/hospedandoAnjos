# FRONT-END-CONTEXT.md — Hospedando Anjos (landing de captação)

> **Memória viva do front-end.** Mantida ao longo do projeto. Fonte de escopo geral:
> `../CONTEXT.md` + `../docs/adr/`. Este arquivo é a verdade do **front**; onde o
> `CONTEXT.md` descreve infra do **backend**, ele prevalece para o back.

---

## 1. Objetivo de negócio

Landing page de campanha do programa **Hospedando Anjos** (Associação Prisma Brasil,
Hortolândia/SP), feita pela agência **Fast**. Meta principal: **maximizar doações
recorrentes (mensais)**; a doação **avulsa** é o caminho secundário.

A página tem três funções: (1) explicar o programa, (2) **converter** no bloco de
doação e (3) **dissolver objeções** (FAQ). Mobile-first, foco em **fricção zero /
checkout em < 20s**.

Divisão de trabalho: **Victor → `frontend/`** (esta landing). **Gabriel → backend**
(Asaas, n8n, Brevo, Manychat).

> **Gateway: Asaas** (não mais Stripe). A Stripe não liberava PIX na avulsa sem ~60
> dias de movimentação; a migração e suas decisões estão no
> [ADR-0005](../docs/adr/0005-migracao-stripe-para-asaas.md). Os ADRs 0001/0003
> (Stripe) ficam como histórico.

---

## 2. Stack e decisões técnicas

| Item | Decisão |
|---|---|
| Framework | **React + Vite + TypeScript** (build estático) — ver `../CONTEXT.md`. |
| Hospedagem | **Firebase Hosting** (decisão do usuário; o front **não** vai no Coolify). |
| Domínio do front | **`anjos.prismabrasil.com.br`** (subdomínio). |
| Pagamento | **Asaas — checkout/cobrança hospedada** (redirect via `invoiceUrl`). O front nunca processa cartão (ADR-0005). |
| Contrato front↔back | Tipos TS em `../shared/checkout-contract.ts` (compartilhado). Inclui `cpf` (obrigatório no Asaas). |
| Variáveis públicas | URL base da API (`VITE_API_BASE_URL`). O Asaas não usa chave pública no front; segredos ficam só no backend. |

> **Nota infra:** o `CONTEXT.md` cita Coolify/VPS — aquilo descreve o **backend**.
> O front foi decidido em **Firebase Hosting**.

---

## 3. Estrutura de seções (página única, rolagem vertical, mobile-first)

1. **Hero** — título + CTA "Quero ser um anjo" (rola até o bloco de doação).
2. **O que é o programa** — explicação, problema, impacto (storytelling primeiro).
3. **Bloco de doação** — **tela única**: âncoras + valor livre + toggle
   recorrente/avulsa + formulário + um botão "Doar". Âncora e valor livre são o
   **mesmo campo** (clicar na âncora preenche; o doador pode sobrescrever).
4. **Como funciona / transparência** — recorrência, cancelamento fácil, segurança.
5. **FAQ** — dissolve objeções.
6. **Rodapé** — institucional, contato.

**Pós-pagamento — rota dedicada `/obrigado`** (decidido): página própria, não seção.
É o destino do redirect pós-checkout do Asaas; exibe mensagem de agradecimento ao
usuário, **sem efeito colateral** (o cadastro no Brevo é feito pelo webhook no
backend, nunca no retorno — o doador pode fechar a aba ou o PIX pode não ter
compensado ainda).

**Cancelamento — rota dedicada `/cancelar`** (decidido): página "burra" que recebe o
link assinado do e-mail (`/cancelar?t=<token>`, variável `{{LINK_CANCELAMENTO}}` do
Brevo). Ao montar, chama `GET {API_BASE}/cancelar?t=<token>` e mostra o resultado.
**1 clique cancela, sem confirmação** (ADR-0005 #3); não recebe nem exibe dados do
doador (o token só permite cancelar, não consultar).

---

## 4. Design System

> **Fonte da identidade visual:** `referencias/referencia-design-system.jpeg`.
> ⚠️ As imagens `referencias/img-1..4` são de **outro produto** do mesmo cliente
> (página de venda de devocional) — servem como referência genérica de UI, **NÃO**
> como paleta. Ignorar o tema dark/premium delas.

**Tom:** claro, quente, acolhedor, esperançoso — fé + música. Mobile-first.

### Cores (valores aproximados, refinar por amostragem na implementação)

| Token | Uso | Valor aprox. |
|---|---|---|
| `--cor-fundo` | fundo creme/pergaminho quente | `#F4ECDA` |
| `--cor-primaria` | azul-marinho profundo (headlines, marca) | `#16264A` |
| `--cor-acento` | dourado/ocre (asas, auréola, corações, notas, molduras) | `#C2A14D` |
| `--cor-texto` | cinza-quente escuro (corpo) | `#3A352E` |

**Gradiente prisma** (assinatura da marca — usar com parcimônia em linhas/detalhes,
não em grandes áreas):
`#E2452B` (vermelho) → `#F08A24` (laranja) → `#F4C430` (amarelo) → `#4CA64C` (verde)
→ `#2B6CB0` (azul).

### Tipografia

| Papel | Onde | Proposta (Google Fonts, a validar) |
|---|---|---|
| **Display serifada (bold)** | títulos grandes ("HOSPEDANDO", "DOE") | **Playfair Display** |
| **Serifada caps (lockup da marca)** | "PRISMA / ASSOCIAÇÃO / BRASIL" | **Cinzel** (estilo Trajan) |
| **Script manuscrita/caligráfica** | palavras-acento ("anjos"), notas afetivas | **Great Vibes** (alt.: Sacramento) |
| **Sans humanista** | corpo e UI (botões, formulário) | **Nunito Sans** (alt.: Mulish) |

> Equivalentes propostos a partir do traço da arte (a arte não traz nomes de fonte).
> Confirmar com o cliente antes de fechar; se houver licença das fontes originais,
> elas têm prioridade.

### Motivos decorativos (uso leve, sem pesar a página)

Asas de anjo em linha dourada, auréola, corações, notas musicais / clave de sol,
molduras curvas.

---

## 5. Fluxo de doação

1. Doador preenche o bloco de doação: `type` (avulsa/recorrente), valor, nome,
   e-mail, WhatsApp (**E.164 com código de país**, sem default `+55`) e **CPF**
   (obrigatório no Asaas; validado no front por módulo 11 — `lib/cpf.ts`).
2. Front faz `POST /checkout` → backend cria a **cobrança/checkout hospedada no
   Asaas** e devolve `{ checkoutUrl }` (o `invoiceUrl` do Asaas).
3. Front **apenas redireciona** para `checkoutUrl` (destino é a tela hospedada do Asaas).
4. Retorno no redirect → exibe mensagem de obrigado. **Sem efeito colateral.**

**Cancelamento (recorrente):** o e-mail traz `/cancelar?t=<token>`; a página
`/cancelar` chama `GET {API_BASE}/cancelar?t=<token>` (helper `lib/cancel.ts`) e
exibe loading → sucesso/inválido/erro. Resposta do backend: `200 {ok:true,message}`,
`400 {ok:false,message}`.

**Mock até o backend subir:** enquanto `VITE_API_BASE_URL` não estiver definida,
`lib/checkout.ts` e `lib/cancel.ts` usam **mocks** (checkout devolve a própria
`/obrigado`; cancelamento devolve sucesso). Quando a API real subir, troca-se só a
URL base.

---

## 6. Integração com o backend (Gabriel)

- **Contrato compartilhado:** `../shared/checkout-contract.ts` (`CheckoutRequest`,
  `CheckoutResponse`, `DonationType`). **Dono do arquivo: Gabriel** (backend). O front
  consome esses tipos; mudanças de payload partem do back.
- **Hospedagem (confirmado pelo Gabriel):** front no **Firebase Hosting**, back na
  **VPS/Coolify** da Fast. Front referencia a API por variável de ambiente (URL real ⏳).
- **Validação de valor é do backend** (nunca confiar no browser). Mínimos:
  **avulsa R$1,00 (100c)**, **recorrente R$20,00 (2000c)**. O front espelha para UX.
- **CPF obrigatório** (Asaas exige para criar o cliente). O front valida por módulo 11
  (`lib/cpf.ts`, espelha `backend/src/lib/cpf.ts`) e envia só dígitos; o backend revalida.
- **Métodos por tipo:** recorrente → **só cartão**; avulsa → **cartão + PIX**
  (sem Apple/Google Pay). A UI deve refletir isso ao alternar o toggle.
- **CORS:** backend libera só a origem do front. URL da API vem de variável de ambiente.
- O cadastro no Brevo e toda a mensageria (n8n/Manychat) acontecem **no backend via
  webhook** — fora do escopo do front.

---

## 7. Pendências / decisões em aberto

- [ ] **Conteúdo do cliente:** textos das seções, perguntas do FAQ, fotos reais da
      ONG, logo em vetor, paleta oficial exata. Sem material ainda → **decisão: seguir
      com placeholders fiéis** à `referencia-design-system.jpeg` até o cliente entregar.
- [x] **Pós-pagamento:** ~~rota × seção~~ → **rota dedicada `/obrigado`**.
- [x] **Dono do `shared/checkout-contract.ts`:** ~~confirmar~~ → **Gabriel** (backend).
- [x] **Migração de gateway:** ~~Stripe~~ → **Asaas** (ADR-0005).
- [x] **CPF no formulário:** campo + validação módulo 11 (`lib/cpf.ts`) + envio no payload.
- [x] **Página `/cancelar`:** cancelamento de recorrente por link assinado (1 clique).
- [ ] **Teto de valores** (avulsa e recorrente) — a fechar com stakeholders (mínimos já definidos).
- [ ] **URL base real da API** — depende do backend do Gabriel (VPS/Coolify); usar mock até lá.
- [ ] **Fontes web:** proposta = Playfair Display / Cinzel / Great Vibes / Nunito Sans
      (ver §4) — **validar com o cliente** antes de fechar.
