# 2. Arquitetura do backend: camadas com adapters

Data: 2026-06-17

## Status

Aceito

## Contexto

O backend é um **tradutor entre APIs externas** (Stripe e Brevo), stateless e
sem banco próprio (ver decisão de backend stateless no CONTEXT.md). A intenção
inicial era "MVC", mas num backend sem persistência não existe a camada Model
(entidades/ORM) do MVC clássico — sobraria um vazio mal definido.

As responsabilidades reais são: receber requisições (checkout, webhook, billing
portal), validar entradas (valor, WhatsApp), orquestrar regra de negócio e
conversar com SDKs externos.

## Decisão

Adotar **Layered Architecture (camadas) com influência Hexagonal / Ports &
Adapters**, na versão pragmática (sem interfaces/ports formais):

```
backend/src/
├── routes/          # liga URL ao controller
├── controllers/     # finos: extrai req, chama service, responde
├── services/        # orquestração da regra de negócio
├── integrations/    # adapters: SDKs externos isolados (Stripe, Brevo)
├── lib/             # lógica PURA, testável sem Express/Stripe/Brevo
│                    #   (money.ts, phone.ts, validation.ts)
├── middleware/      # rawBody p/ webhook, error handler, validação
├── config/          # env vars, segredos
└── app.ts / server.ts
```

Regra de dependência: cada camada só conhece a de baixo. `lib/` não depende de
nada externo. `integrations/` isola os SDKs — uma mudança na API da Stripe toca
um arquivo só.

## Consequências

- Núcleo de regra testável sem subir Express nem mockar Stripe (validação de
  valor e normalização E.164 em `lib/`).
- SDKs isolados em `integrations/` — fáceis de atualizar e de mockar em teste.
- `webhook.service` concentra o roteamento dos 3 eventos — leitura clara do que
  acontece em pagar / cancelar / falhar.
- **Não** adotamos Hexagonal purista (ports/interfaces, inversão de dependência
  formal): seria overkill para um backend deste tamanho. Se no futuro for preciso
  trocar Stripe por um fake em testes ou ter múltiplas implementações de uma
  integração, reabrir para introduzir ports explícitos.
- `services/` (orquestração) e `integrations/` (SDK cru) ficam separados de
  propósito, mesmo o projeto sendo pequeno, porque o coração do projeto É
  integração externa.
