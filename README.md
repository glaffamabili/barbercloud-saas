# 💈 BarberCloud — Sistema SaaS de Agendamento, Catálogo de Serviços e Gestão para Barbearias & Estúdios de Beleza

> **ISW055 · Introdução à Computação em Nuvem (2026.2)**  
> **Professor:** Prof. Allan Lincoln Rodrigues Siriani — [@siriani](https://github.com/siriani) ([github.com/siriani](https://github.com/siriani))  
> **Aluna:** Amabili Flor (`161_SIST. INTELIGENTES_N`)  
> **Aplicação em Produção:** [https://amabili-flor-isw055.lapps.studio/](https://amabili-flor-isw055.lapps.studio/)  
> **Repositório de Origem (P1 — Atividades 1 a 8):** [github.com/glaffamabili/catalogo-tom-hanks](https://github.com/glaffamabili/catalogo-tom-hanks)  
> **Repositório do Produto SaaS (P2 — Atividades 9 a 11):** [github.com/glaffamabili/barbercloud-saas](https://github.com/glaffamabili/barbercloud-saas)  
> 📘 **Documentação Técnica Reversa:** [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) | 📄 **Relatório Consolidado P2 (PDF):** [`docs/P2_ISW055_Amabili_Flor.pdf`](./docs/P2_ISW055_Amabili_Flor.pdf)

---

## 🧭 Plano de Negócio do Produto SaaS (Atividade 9)

### 1. Nome e Frase do Produto
**BarberCloud** — *A agenda inteligente na nuvem para barbearias, salões e pet shops que elimina furos de horário, organiza comissões e profissionaliza o atendimento sem cobrar comissão por corte.*

---

### 2. A Dor (O Problema Real de Mercado)
Mais de 80% das micro e pequenas barbearias, estúdios de estética e banho & tosa de bairro no Brasil ainda gerenciam sua operação inteira pelo **WhatsApp misturado com conversas pessoais** ou em **cadernos de papel no balcão**. Isso gera quatro dores financeiras e operacionais graves todos os dias:
1. **Tempo perdido respondendo mensagens repetitivas:** O barbeiro precisa parar o atendimento com a tesoura ou máquina na mão para responder *"Tem horário hoje às 18h?"* ou *"Quanto custa o corte + barba?"*.
2. **Conflitos de agenda e "No-Show" (Furos de Horário):** Duplo agendamento no mesmo horário por erro manual e clientes que esquecem do horário marcado ou não enviam comprovante de sinal/PIX, deixando a cadeira vazia (prejuízo médio de 15% a 25% do faturamento semanal).
3. **Falta de vitrine visual e histórico por cliente:** O cliente não consegue ver fotos reais dos cortes/serviços realizados, a duração exata de cada procedimento nem o histórico de atendimentos e avaliações.
4. **Sistemas tradicionais caros ou predatórios:** Plataformas grandes cobram mensalidades altas por profissional cadastrado ou retêm taxas abusivas sobre cada agendamento online.

---

### 3. Persona (Cliente Ideal)
- **Nome e Perfil:** **Lucas Almeida (29 anos)**, barbeiro-proprietário da *"Barbearia Dom Lucas"*, localizada em um bairro comercial de médio porte em Sorocaba/SP.
- **Rotina e Contexto:** Trabalha com mais 2 barbeiros parceiros, atende em média 18 a 25 clientes por dia (terça a sábado, das 9h às 20h) e recebe cerca de 60 mensagens diárias no WhatsApp.
- **Frustrações:** Perde de 3 a 4 horários todo sábado por clientes que somem sem avisar; não sabe exatamente quantos cortes cada profissional realizou no mês e acha sistemas como Trinks/Booksy complexos demais para configurar.
- **O que valoriza:** Um link simples para colocar na bio do Instagram onde o cliente veja os serviços com foto e preço, escolha o horário, anexe o comprovante ou foto de referência e receba confirmação por e-mail com segurança.

---

### 4. Concorrentes e Alternativas Atuais

| Concorrente / Alternativa | Como Funciona Hoje | Limitação / Por que a Persona não fica satisfeita |
| :--- | :--- | :--- |
| **1. WhatsApp + Caderno / Google Agenda (Alternativa Manual)** | O cliente manda mensagem, aguarda resposta manual do barbeiro e o horário é anotado no papel ou agenda comum. | Exige atendimento humano constante, gera erros de encaixe, não tem catálogo de preços com fotos nem controle por papel (`cliente` vs `profissional`). |
| **2. Booksy** | Plataforma global de agendamento para barbearias e salões. | Mensalidade elevada em dólar/real com cobrança adicional por cada membro da equipe e taxas sobre captação de novos clientes. |
| **3. Trinks / Avec** | ERP completo para grandes salões de beleza e clínicas de estética. | Interface complexa voltada a grandes redes (estoque fiscal, NFSe pesada), custo inicial alto e sem plano gratuito funcional para o barbeiro autônomo começar. |
| **4. AppBarber / Belasis** | Sistemas nacionais de gestão de barbearias. | Planos de entrada muito restritos, curva de aprendizado longa e falta de transparência em auditoria de eventos e portal simples de autogestão de assinatura. |

---

### 5. Proposta de Valor
O **BarberCloud** entrega **agendamento online em 30 segundos com catálogo visual de serviços em S3 (MinIO), isolamento de agenda por usuário/profissional, autenticação segura em 2 etapas (2FA) e cobrança transparente via Stripe**. Diferente do WhatsApp (que toma tempo do barbeiro) e do Booksy/Trinks (que cobram caro por cadeira), o BarberCloud permite começar grátis imediatamente e escalar para agendamentos e serviços ilimitados por um valor fixo acessível de **R$ 29,90/mês**, sem comissão sobre os serviços prestados.

---

### 6. Modelo de Receita (Planos e Preços no Stripe)

A monetização é baseada em **assinatura recorrente mensal (SaaS Subscription)** processada em modo de teste pelo **Stripe** (`mode: subscription`), com dois planos claros e verificação de limite no backend a cada requisição:

| Recurso / Limite | 🆓 Plano **Free** (`R$ 0,00 / mês`) | 👑 Plano **Pro** (`R$ 29,90 / mês`) |
| :--- | :--- | :--- |
| **Público-Alvo** | Barbeiro iniciante ou cliente testando a plataforma | Barbearia / Profissional em operação diária |
| **Limite de Agendamentos / Serviços Ativos** | **Até 3 registros** (bloqueia o 4º com `HTTP 403 PLAN_LIMIT_REACHED`) | **Ilimitado** (agendamentos e catálogo sem teto) |
| **Catálogo de Serviços com Fotos (MinIO S3)** | ✅ Incluso (upload até 5 MB por imagem) | ✅ Incluso + Destaque visual no catálogo |
| **Anexo de Comprovante / Referência no Agendamento** | ✅ Incluso | ✅ Incluso |
| **Selo e Prioridade na Plataforma** | Conta Padrão (`plano: free`) | Selo verificado `👑 PRO ATIVO` (`plano: pro`) |
| **Gestão de Assinatura (Stripe Billing Portal)** | Upgrade instantâneo via Stripe Checkout | Troca de plano ou cancelamento a qualquer momento no Portal do Cliente |

---

### 7. Métricas de Sucesso (Metas para 90 Dias)
Para validar a tração e a sustentabilidade financeira do **BarberCloud** nos primeiros 3 meses de operação, acompanhamos três indicadores-chave (visíveis em tempo real no Painel Admin do sistema):
1. **Base de Assinantes Pagantes (Plano Pro):** Atingir **30 barbearias/profissionais assinantes ativos** no plano Pro (além de 120 usuários no plano Free, gerando taxa de conversão Free → Pro de **20%**).
2. **MRR (Monthly Recurring Revenue / Receita Recorrente Mensal):** Alcançar **R$ 897,00 de MRR** (`30 assinantes Pro × R$ 29,90/mês`).
3. **Retenção Mensal / Churn Rate:** Manter a **retenção líquida acima de 90% ao mês** (Churn mensal inferior a 10%, monitorado diretamente pelos webhooks `customer.subscription.deleted` e `invoice.payment_failed` do Stripe).

---

### 8. Lean Canvas — BarberCloud

| Bloco do Lean Canvas | Definição Estratégica do BarberCloud |
| :--- | :--- |
| **1. Problema** | • Barbeiros perdem horas no WhatsApp respondendo preços e horários disponíveis.<br>• Furos de agenda (*no-show*) e conflitos de horário anotados em papel.<br>• Sistemas existentes cobram caro por profissional ou exigem implantação complexa. |
| **2. Segmentos de Clientes** | • **Primário:** Barbearias independentes, barbeiros autônomos, pequenos salões de beleza e pet shops de bairro.<br>• **Secundário:** Clientes finais que desejam agendar horários online 24/7 sem esperar resposta no WhatsApp. |
| **3. Proposta de Valor Única** | *"Transforme seu WhatsApp caótico em uma vitrine de serviços com fotos e agendamento online em 5 minutos — comece grátis e cresça por R$ 29,90/mês fixos."* |
| **4. Solução** | • Catálogo público e autenticado de serviços (`corte`, `barba`, `combo`, `estética`) com fotos no MinIO.<br>• Motor de agendamento com status (`agendado`, `confirmado`, `concluido`, `cancelado`) e anexo de comprovante.<br>• Avaliações pós-atendimento e painel de métricas SaaS (MRR, assinantes e auditoria Redis). |
| **5. Canais** | • Link direto na bio do Instagram e mensagem automática do WhatsApp Business da barbearia.<br>• Landing Page pública do BarberCloud com demonstração ao vivo dos planos.<br>• Parcerias com distribuidoras locais de cosméticos para barbearia. |
| **6. Fontes de Receita** | • Modelo **Freemium SaaS** com assinatura mensal recorrente via **Stripe**:<br>  - Plano **Free:** R$ 0,00/mês (até 3 agendamentos/serviços).<br>  - Plano **Pro:** R$ 29,90/mês (agendamentos e serviços ilimitados). |
| **7. Estrutura de Custos** | • Infraestrutura Cloud IaaS/Containers (VM Linux + Docker + MariaDB + Redis + MinIO).<br>• Taxa de processamento do Stripe por transação bem-sucedida.<br>• Serviço de disparo de e-mails transacionais SMTP (2FA e lembretes). |
| **8. Métricas-Chave** | • **MRR** (Receita Recorrente Mensal em R$).<br>• Número de usuários por plano (`Free` vs `Pro`) e taxa de conversão.<br>• Volume diário de eventos de negócio no Redis Streams (`AGENDAMENTO_CRIADO`, `SERVICO_CRIADO`).<br>• Taxa de cancelamento (*Churn*) via webhook Stripe. |
| **9. Vantagem Injusta** | • Arquitetura cloud-native enxuta baseada em microsserviços desacoplados, auditoria assíncrona em tempo real via Redis Streams e conformidade PCI nativa via Stripe Checkout + Billing Portal. |

---

## 🔄 Mapa de Reaproveitamento Arquitetural (Do Catálogo de Filmes para o BarberCloud)

Conforme planejado na **Atividade 9** e executado nas **Atividades 10 e 11**, toda a engenharia construída na P1 foi reaproveitada para sustentar o novo domínio de negócio:

| Peça do Projeto Original (`catalogo-tom-hanks`) | O que vira no Produto SaaS (`barbercloud-saas`) |
| :--- | :--- |
| **`auth-service` (Cadastro, DNS MX, Login 2FA e Reset de Senha)** | **Central de Identidade Multi-Papel do BarberCloud:** Mantém validação DNS MX, 2FA por e-mail e recuperação de senha, expandindo o controle de papéis para **`cliente`**, **`profissional`** (barbeiro) e **`admin`**, além do ciclo de vida completo de assinatura (`free` vs `pro`). |
| **`catalog-service` (Listagem TMDB, Favoritos e Comentários)** | **Core Business Service (`barbercloud-service`):** Substitui os filmes do TMDB pelo **CRUD completo de Serviços da Barbearia (`servicos_barbearia`), Agendamentos (`agendamentos`) e Avaliações (`avaliacoes_atendimento`)**, com isolamento por usuário/profissional. |
| **`mariadb` (Tabelas `usuarios`, `favoritos`, `comentarios`)** | **Banco Relacional do Domínio (`db/001_dominio.sql`):** Mantém `usuarios`, `codigos_autenticacao` e `reset_tokens`, e adiciona as tabelas relacionais com chaves estrangeiras `servicos_barbearia`, `agendamentos`, `avaliacoes_atendimento` e `eventos_stripe_processados` (idempotência). |
| **`redis` + `log-service` (Stream `audit_logs` via `XREADGROUP`)** | **Barramento de Eventos de Negócio SaaS:** Registra e processa assincronamente eventos reais do domínio: `AGENDAMENTO_CRIADO`, `AGENDAMENTO_ATUALIZADO`, `AGENDAMENTO_CANCELADO`, `SERVICO_CRIADO`, `COMPROVANTE_ENVIADO_MINIO`, `LIMITE_FREE_ATINGIDO_403` e os 4 webhooks do Stripe. |
| **`minio` (Bucket S3 de Foto de Perfil)** | **Armazenamento S3 de Catálogo e Comprovantes (`barbercloud-midia` + `perfil-fotos`):** Armazena tanto as fotos de avatar quanto as **fotos reais dos cortes/serviços do catálogo e comprovantes de agendamento**, salvando a chave S3 nos registros do domínio. |
| **`Stripe` (Checkout de pagamento único na Atividade 7)** | **Motor Completo de Assinaturas Recorrentes SaaS (Atividade 11):** Gerencia planos **Free (R$ 0)** e **Pro (R$ 29,90/mês)** com `mode=subscription`, **Portal do Cliente (Billing Portal)** e processamento idempotente dos 4 eventos de ciclo de vida (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`). |
| **Swagger OpenAPI 3.0 + `/health` + `/metrics` + GitHub Actions CI/CD** | **Governança, Observabilidade e Entrega Contínua do SaaS:** Documentação interativa atualizada para as rotas do BarberCloud, healthcheck real das dependências, métricas Prometheus e pipeline automatizado de testes e build Docker. |

---

## 🏗️ Funcionalidades de Domínio e SaaS Implementadas (Atividades 10 e 11)

1. **Migração e Seed SQL (`db/001_dominio.sql`):**
   - Mais de 3 tabelas de domínio com integridade referencial (`FOREIGN KEY`): `servicos_barbearia`, `agendamentos`, `avaliacoes_atendimento` e `eventos_stripe_processados`.
2. **CRUD Completo de Domínio + Isolamento Multi-Tenant:**
   - **Catálogo de Serviços (`/api/servicos`):** Listagem, filtros por categoria, criação, edição e exclusão com upload de foto para o MinIO.
   - **Agendamentos (`/api/agendamentos`):** Criação de horário vinculado a serviço e profissional, visualização detalhada, edição de horário/status/observações, upload de comprovante/referência no MinIO e cancelamento/exclusão.
   - **Isolamento Estrito por Usuário (`403 Forbidden`):** Cada cliente visualiza, edita e cancela apenas os seus próprios agendamentos. Tentativas de acessar ou modificar o agendamento de outro usuário pelo `:id` na API retornam `HTTP 403 Forbidden` e geram alerta no Redis Streams.
3. **RBAC com 3 Papéis de Negócio (`cliente`, `profissional`, `admin`):**
   - `cliente`: Agenda serviços, envia comprovante, avalia atendimentos concluídos e gerencia sua assinatura. Tentativa de cadastrar ou remover serviços do catálogo retorna `HTTP 403 Forbidden`.
   - `profissional` (Barbeiro/Especialista): Cadastra e edita seus serviços no catálogo com fotos no MinIO e atualiza o status dos agendamentos atribuídos a ele (`confirmado`, `concluido`).
   - `admin`: Visão global da operação, gestão de papéis, moderação e **Dashboard SaaS com MRR, contagem de usuários por plano, assinaturas ativas e trilha de eventos do Redis**.
4. **Ciclo Completo de Assinatura Stripe + Portal do Cliente + Idempotência:**
   - Limite de 3 agendamentos ativos no **Plano Free**, bloqueando o 4º com `HTTP 403` e CTA de upgrade.
   - Webhook `POST /api/webhooks/stripe` validando assinatura HMAC e garantindo idempotência na tabela `eventos_stripe_processados` para os 4 eventos exigidos (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`).
   - **Portal do Cliente (`POST /api/billing/portal` / `/billing-portal.html`):** Permite ao usuário trocar de plano ou cancelar imediatamente sua assinatura Pro em modo de teste.

---

## 🚀 Como Executar Localmente

```bash
# 1. Clonar o repositório do produto SaaS
git clone https://github.com/glaffamabili/barbercloud-saas.git
cd barbercloud-saas

# 2. Executar as suítes de testes automatizados (Auth + BarberCloud SaaS)
cd auth-service && npm test && cd ../catalog-service && npm test && cd ..

# 3. Subir todos os 6 containers com Docker Compose
docker compose up -d --build
```
- **Landing Page & Aplicação SaaS:** `http://localhost:8200`
- **Swagger UI (OpenAPI 3.0):** `http://localhost:8200/apidocs`
- **Health Check:** `http://localhost:8200/health`
- **Métricas Prometheus:** `http://localhost:8200/metrics`
