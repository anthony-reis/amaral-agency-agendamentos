# Loja / Mercado Pago — Guia de Operação

Documentação de referência da feature de vendas (pacotes de aulas, avulsas e serviços) com Mercado Pago Checkout Pro. Revisite este arquivo sempre que for configurar uma autoescola nova ou testar em homolog.

---

## 1. Modelo geral

- **Cada autoescola tem sua PRÓPRIA conta Mercado Pago.** 100% de cada venda cai direto na conta dela — o AmaralPro não intermedia dinheiro. A única taxa é a do próprio MP.
- As credenciais de cada autoescola são cadastradas pela equipe AmaralPro em **`/admin` → Clientes → (autoescola) → Pagamentos**.
- A feature é **invisível e inerte** para qualquer autoescola sem credencial ativa cadastrada (nem o menu aparece). Produção continua 100% intacta até você cadastrar credenciais reais.

### O aluno precisa de conta no Mercado Pago? **NÃO.**

O Checkout Pro aceita **pagamento como convidado**:
- **Pix**: escaneia o QR code ou copia-e-cola no app do banco dele. Sem cadastro.
- **Cartão**: digita os dados do cartão direto no checkout. Sem cadastro.
- **Boleto**: gera e paga no banco. Sem cadastro.

Portanto: **alunos já cadastrados não precisam de nenhum dado extra, e o cadastro de alunos novos não muda em nada.** O e-mail do aluno (campo já existente em `students`) é usado apenas para pré-preencher o checkout — é opcional.

> Os "usuários de teste comprador" existem **só para o sandbox** (seção 4). Cliente real nunca precisa disso.

---

## 2. Mapeamento das credenciais — onde inserir cada informação

Para **cada autoescola**, você vai obter 3 valores na conta MP dela e inserir em `/admin` → Clientes → (autoescola) → **Pagamentos**:

| Informação do Mercado Pago | Exemplo (formato) | Onde inserir no /admin |
|---|---|---|
| **Access Token** | `APP_USR-1311858862...-...-3546973139` | Campo **Access Token** |
| **Public Key** | `APP_USR-7962206a-efdd-...` | Campo **Public Key** |
| **Assinatura secreta do Webhook** | string longa gerada pelo MP | Campo **Webhook Secret** |

E os toggles:

| Toggle | Quando marcar |
|---|---|
| **Pagamentos ativos** | Sempre que a loja dever funcionar. Desmarcar = loja some para painel e alunos. |
| **Sandbox (teste)** | ✅ para credenciais de usuário de teste (homolog). ❌ para credenciais reais de produção. |

As demais informações que o MP mostra (**N.º da aplicação**, **User ID**, usuário/senha/código de verificação) **não são inseridas no sistema** — servem apenas para você fazer login e administrar a conta/aplicação no site do MP.

### De onde vêm esses valores (na conta MP da autoescola)

1. Logar na conta Mercado Pago da autoescola → [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) → **Suas integrações** → **Criar aplicação** (uma vez por autoescola; nome ex.: "Loja AmaralPro").
2. Dentro da aplicação → **Credenciais de produção**: copiar **Access Token** e **Public Key** (começam com `APP_USR-`).
3. Dentro da aplicação → **Webhooks** → **Configurar notificações**:
   - **URL**: copie da própria tela de Pagamentos do `/admin` — formato:
     `https://SEU-DOMINIO/api/webhooks/mercadopago?autoescola_id=<uuid-da-autoescola>`
     (cada autoescola tem a SUA URL, com o próprio `autoescola_id`)
   - **Evento**: marcar **Pagamentos** (payments).
   - Salvar → o MP exibe a **assinatura secreta** → esse é o **Webhook Secret**.
4. Colar os 3 valores no `/admin`, marcar **Pagamentos ativos**, e Sandbox conforme o caso.

⚠️ **Nunca** commitar, colar em chat/print ou expor o Access Token e o Webhook Secret. Se vazar, revogue e gere novos na aplicação do MP (e atualize no /admin). O sistema só exibe os últimos 4 dígitos após salvar.

---

## 3. Checklist de onboarding de uma autoescola nova (produção)

1. [ ] Autoescola cria conta Mercado Pago **PJ** (própria) e completa a verificação.
2. [ ] Criar aplicação em Suas integrações (seção 2).
3. [ ] Configurar webhook com a URL da autoescola + evento Pagamentos → obter secret.
4. [ ] Cadastrar Access Token + Public Key + Webhook Secret no `/admin` → Pagamentos, **Sandbox ❌**, **Ativos ✅**.
5. [ ] Autoescola monta o catálogo no painel: **Painel → Vendas → Catálogo** (pacotes, avulsas, serviços, preços).
6. [ ] Teste real de ponta a ponta com um valor baixo (ex.: produto de R$ 1,00 via Pix) e estorno depois, se quiser.
7. [ ] Conferir: pedido `aprovado` em Painel → Vendas, créditos do aluno somados, linha em Auditoria.
8. [ ] (Opcional) Orientar a autoescola sobre prazos de recebimento do MP (Pix/boleto na hora; cartão conforme configuração da conta dela em "Prazos de liberação").

---

## 4. Homolog / Sandbox — como testar sem dinheiro real

O modelo de teste do MP usa **usuários de teste** (contas fictícias completas):

- **Vendedor de teste** (ex.: `TESTUSER3962...`): faz o papel da "autoescola". Você loga com ele no site do MP, cria uma **aplicação** dentro dele, e usa as credenciais `APP_USR-...` **dessa aplicação do usuário de teste** no `/admin` da autoescola **Homolog**, com **Sandbox ✅**.
  - Atenção: as credenciais que o vendedor de teste gera têm formato `APP_USR-...` normal — o que as torna "de teste" é pertencerem a um usuário de teste.
- **Comprador de teste** (ex.: `TESTUSER6082...`): faz o papel do "aluno" no checkout. Ao cair na tela do Mercado Pago durante o teste, **logue com o usuário/senha do comprador de teste** (ou pague como convidado com os cartões de teste abaixo).
- Nunca misturar: vendedor de teste vende, comprador de teste compra. Não usar sua conta real em nenhum dos lados do sandbox.

### Configuração do webhook em homolog

O MP precisa alcançar sua aplicação pela internet → use a URL do deploy (Vercel):
`https://<deploy-homolog>/api/webhooks/mercadopago?autoescola_id=521bac76-1e6e-4f83-ad3f-d7bd4d039880`
Configure no painel de Webhooks da aplicação do **vendedor de teste**, evento Pagamentos, e cole o secret gerado no `/admin` da Homolog. A env `NEXT_PUBLIC_APP_URL` do deploy deve ser a URL do próprio deploy.

### Cartões de teste (checkout como convidado)

Use qualquer cartão de teste do MP (números na [doc oficial](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards)) e controle o resultado pelo **nome do titular**:

| Nome do titular | Resultado |
|---|---|
| `APRO` | Aprovado ✅ |
| `OTHE` | Recusado (erro geral) |
| `FUND` | Recusado (sem saldo) |
| `CONT` | Pendente |

CPF de teste: `12345678909`. Para Pix/boleto sandbox, siga o fluxo do checkout logado como comprador de teste.

### Checklist E2E de homolog

- [ ] Cartão `APRO` → pedido `aprovado`, créditos somados, linha em `historico_creditos` e Auditoria.
- [ ] Cartão `OTHE`/`FUND` → pedido `rejeitado`, sem créditos.
- [ ] Parcelamento até 12x aparece no checkout.
- [ ] Pix aprova e credita.
- [ ] Boleto: pedido fica `pendente`; ao compensar, credita sozinho (mesmo dias depois).
- [ ] Reenviar o mesmo webhook (painel MP → notificação → reenviar) → créditos NÃO duplicam.
- [ ] Combo (ex.: 10 carro + 10 moto) credita nas duas categorias.
- [ ] Produto tipo `servico` (ex.: Aluguel para Prova) aprova sem creditar aulas.
- [ ] Painel → Vendas mostra tudo com status/método/valor; aluno vê em Minhas Compras.

---

## 5. Fluxo técnico (resumo para depuração)

1. Aluno (identificado por cookie `student_id`) clica **Comprar** na Loja → server action `criarCheckout` (`src/features/aluno/actions/loja.ts`): cria linha em `pedidos_loja` (status `pendente`, com `produto_snapshot`) → cria preference no MP → redirect ao checkout.
2. Aluno paga no Mercado Pago → MP chama `POST /api/webhooks/mercadopago?autoescola_id=...`.
3. Webhook (`src/app/api/webhooks/mercadopago/route.ts`): valida assinatura HMAC com o secret do tenant → re-busca o pagamento na API do MP com o token do tenant → confere valor → marca `aprovado` + `creditos_liberados` (idempotente) → `creditarPedido` (`src/lib/creditos.ts`) soma em `student_credits`, grava `historico_creditos` e Auditoria.
4. A página de retorno faz polling de `consultarPedido` e mostra sucesso/pendente/recusado.

**Regras importantes:**
- O crédito sai SEMPRE do `produto_snapshot` do pedido — editar/excluir produto não afeta pedidos já feitos.
- Boleto pago dias depois credita normalmente (o status anterior não bloqueia).
- **Estorno/chargeback NÃO remove créditos automaticamente** — gera alerta na Auditoria (`action_type: venda`) para ajuste manual em Alunos → créditos.
- Webhook duplicado nunca credita duas vezes (update condicional em `creditos_liberados`).

## 6. Tabelas envolvidas

| Tabela | Papel |
|---|---|
| `produtos` | Catálogo por autoescola (qtd de aulas por categoria A–E, preço em centavos, tipo pacote/avulsa/servico, flag automático) |
| `autoescola_pagamentos` | Credenciais MP por autoescola (nunca expostas ao browser) |
| `pedidos_loja` | Pedidos/vendas (snapshot do produto, status, ids do MP, idempotência) |
| `student_credits` | Saldo de aulas do aluno (colunas `aulas_cat_a..e`) — recebe os créditos |
| `historico_creditos` | Log de cada crédito concedido por compra |
| `activity_logs_painel` | Auditoria (`action_type: catalogo` e `venda`) |

> A tabela `pedidos` antiga (InfinitePay) é legado abandonado — não usar.
