# 🎬 Catálogo de Filmes — Tom Hanks
> **ISW055 · Introdução à Computação em Nuvem**  
> Professor: [@siriani](https://github.com/siriani) — [github.com/siriani](https://github.com/siriani)  
> Aplicação em Produção: [https://amabili-flor-isw055.lapps.studio/](https://amabili-flor-isw055.lapps.studio/)  
> 📘 **Documentação Técnica Reversa Completa (Atividade 8):** [**`DOCUMENTACAO.md`**](./DOCUMENTACAO.md)

---

## 📑 Sumário das Implementações
1. [Classificação da Arquitetura em Nuvem (IaaS, PaaS e SaaS) — Atividade 8](#-1-classificação-da-arquitetura-em-nuvem-iaas-paas-e-saas)
2. [Documentação Técnica Reversa (`DOCUMENTACAO.md`) — Atividade 8](#-2-documentação-técnica-reversa-documentacaomd)
3. [Plano Premium com Stripe (Checkout & Webhook) — Atividade 7](#-3-plano-premium-com-stripe-checkout--webhook)
4. [Documentação Swagger / OpenAPI 3.0](#-4-documentação-swagger--openapi-30)
5. [CI/CD com GitHub Actions](#-5-cicd-com-github-actions)
6. [Observabilidade: Health Checks e Métricas Prometheus](#-6-observabilidade-health-checks-e-métricas)
7. [Controle de Acesso por Papel (RBAC)](#-7-controle-de-acesso-por-papel-rbac)
8. [Como Executar Localmente](#-8-como-executar-localmente)

---

## ☁️ 1. Classificação da Arquitetura em Nuvem (IaaS, PaaS e SaaS)

Na **Atividade 8**, todas as peças que compõem este projeto foram analisadas e classificadas dentro dos três modelos clássicos de serviço em computação em nuvem (**IaaS**, **PaaS** e **SaaS**), considerando a responsabilidade operacional real sobre cada camada:

| Peça / Componente do Projeto | Classificação | Justificativa Técnica (Quem gerencia o quê?) |
| :--- | :---: | :--- |
| **Máquina Virtual no Cluster (Proxmox VE / Linux Host)** | **IaaS**<br>*(Infrastructure as a Service)* | O provedor de infraestrutura (cluster LApps / Proxmox) entrega apenas o hardware virtualizado (vCPU, RAM, disco virtual e interface de rede). Toda a gestão do Sistema Operacional Linux, pacotes, rede local, firewall e runtime de containers fica sob nossa responsabilidade. |
| **Orquestração de Containers (Docker Engine + Portainer)** | **PaaS (Self-Hosted / CaaS)**<br>*(Platform / Container as a Service sobre IaaS)* | Funciona como camada de plataforma intermediária sobre a VM: abstrai o empacotamento e ciclo de vida dos processos (`catalog-service`, `auth-service`, `log-service`) via `docker-compose.yml`, redes virtuais isoladas, healthchecks e variáveis de ambiente. |
| **Banco de Dados Relacional (`mariadb:10.6` em container)** | **IaaS / Self-Managed em Container**<br>*(Não é DBaaS/PaaS gerenciado)* | Embora forneça um motor de banco de dados, ele **não** é consumido como um PaaS gerenciado (como AWS RDS ou Cloud SQL): nós mesmos gerenciamos o container, o volume persistente (`mysql-data`), a inicialização de schemas e os backups dentro da nossa infraestrutura. |
| **Mensageria e Streams (`redis:7-alpine` em container)** | **IaaS / Self-Managed em Container** | Assim como o MariaDB, o broker Redis que sustenta o stream `audit_logs` roda em container próprio na nossa VM (`redis-data` com AOF habilitado), exigindo configuração e monitoramento próprios em vez de um serviço gerenciado (como AWS ElastiCache). |
| **Object Storage S3 (`minio/minio` em container)** | **IaaS / Self-Managed Storage**<br>*(API estilo PaaS S3)* | O código consome o MinIO usando exatamente o SDK e protocolo de um serviço de nuvem (`@aws-sdk/client-s3`), mas a operação física do bucket `perfil-fotos` e do volume `minio-data` ocorre dentro do nosso próprio Docker Compose. |
| **Provedor de Pagamentos (Stripe Checkout & Webhooks)** | **SaaS / API-as-a-Service (BaaS)**<br>*(Software as a Service)* | Consumido 100% como serviço pronto na nuvem via API HTTPS e painel web pronto. Não gerenciamos servidores, banco de dados, conformidade PCI-DSS nem páginas de captura de cartão: apenas criamos a `Checkout Session` e recebemos o webhook assinado. |
| **Serviço de E-mail Transacional (Mailtrap / SMTP Externo)** | **SaaS / PaaS de Mensageria** | Consumido como serviço externo gerenciado via protocolo SMTP para entrega e caixa de entrada dos códigos de autenticação de dois fatores (2FA) e links de recuperação de senha, sem necessidade de manter um servidor Postfix próprio. |
| **API de Metadados de Filmes (TMDB API)** | **SaaS / Data-as-a-Service** | Plataforma externa pronta consumida via REST (`api.themoviedb.org`). Toda a base de dados mundial de filmes, imagens de pôsteres e CDN é mantida integralmente por terceiros. |
| **GitHub + GitHub Actions (Repositório e CI/CD)** | **SaaS / PaaS de DevOps** | O controle de versão, gestão de Issues e execução dos pipelines de integração e build (`.github/workflows/ci-cd.yml`) rodam em infraestrutura e software inteiramente gerenciados pelo GitHub. |
| **O Próprio Sistema (`Catálogo Tom Hanks`) para o Usuário Final** | **SaaS**<br>*(Software as a Service)* | Para o usuário final que acessa pelo navegador (`https://amabili-flor-isw055.lapps.studio/`), cria conta, favorita filmes e assina o Plano Premium por R$ 9,90/mês, o sistema é entregue pronto para uso, sem que o cliente precise instalar ou configurar nada. |

---

## 📘 2. Documentação Técnica Reversa (`DOCUMENTACAO.md`)

A documentação técnica reversa completa do sistema — escrita como se o projeto estivesse sendo entregue para manutenção por outro desenvolvedor — encontra-se no arquivo dedicado:

👉 **[Acessar `DOCUMENTACAO.md` — Especificação, Arquitetura, Regras de Negócio e Modelo de Dados](./DOCUMENTACAO.md)**

O documento contempla:
1. **Especificação Funcional:** Descrição completa do sistema sob a perspectiva do usuário final e do administrador.
2. **Arquitetura:** Diagrama completo de todos os microsserviços (`catalog-service`, `auth-service`, `log-service`), bancos (`MariaDB`, `Redis`, `MinIO`) e integrações externas (`Stripe`, `TMDB`, `SMTP`), detalhando o que é público e o que fica isolado na rede interna.
3. **Regras de Negócio Extraídas do Código:** 17 regras explícitas no formato `"Se X, então Y"` (validação DNS MX, 2FA em 10 min, reset de senha em 30 min, moderação RBAC 403, limite de 5 MB no MinIO, limite de 3 favoritos no plano Free vs. ilimitado no Premium e validação HMAC de webhook do Stripe).
4. **Modelo de Dados:** Diagrama Entidade-Relacionamento (DER) e tabelas detalhadas do MariaDB, além da estrutura do stream `audit_logs` no Redis e das chaves S3 no MinIO.

---

## 💳 3. Plano Premium com Stripe (Checkout & Webhook)

Implementado na **Atividade 7**, o sistema conta com monetização em **Modo de Teste do Stripe**:
- **Plano Premium (R$ 9,90/mês):** Criado em modo de teste, sem armazenar nenhum dado sensível de cartão (número, CVV ou validade) no banco da aplicação.
- **Endpoint de Checkout (`POST /api/checkout/create-session`):** Cria uma sessão de checkout para o usuário logado e redireciona para a página hospedada de pagamento.
- **Endpoint de Webhook (`POST /api/webhooks/stripe`):** Recebe de forma assíncrona o evento `checkout.session.completed`, valida criptograficamente o header `Stripe-Signature` (HMAC-SHA256) e atualiza o usuário para `premium = TRUE` no MariaDB.
- **Benefício Real Verificável:** Usuários comuns possuem limite de até **3 filmes favoritos** (`HTTP 403 PREMIUM_REQUIRED` ao tentar adicionar o 4º filme). Usuários **Premium** possuem **favoritos ilimitados** e exibem o selo exclusivo `👑 PREMIUM` no cabeçalho e no perfil.

---

## 📄 4. Documentação Swagger / OpenAPI 3.0

Todos os endpoints dos serviços estão especificados e documentados sob o padrão **OpenAPI 3.0**, permitindo a visualização interativa e execução de chamadas reais com **"Try it out"** direto pelo navegador.

### Links das Interfaces Swagger UI:
- **Catálogo API (Catalog Service):** [`/apidocs`](https://amabili-flor-isw055.lapps.studio/apidocs) ou [`/docs`](https://amabili-flor-isw055.lapps.studio/docs)
- **Arquivo da Especificação:** [`catalog-service/openapi.json`](./catalog-service/openapi.json)
- **Auth Service API:** [`auth-service/openapi.json`](./auth-service/openapi.json) (acessível internamente em `/apidocs`)

### O que está documentado em cada endpoint:
- **Método HTTP e Rota** (ex: `POST /api/register`, `GET /api/movies`, `DELETE /api/comments/{id}`).
- **Parâmetros e Corpo da Requisição** com schemas JSON e validações.
- **Códigos de Resposta:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (RBAC) e `500 Internal Server Error`.

---

## 🤖 5. CI/CD com GitHub Actions

O repositório possui um pipeline automatizado de Integração e Entrega Contínua em [`.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml), acionado a cada `push` ou `pull_request` na branch `main`.

### Etapas do Pipeline:
1. **CI (Continuous Integration):**
   - Faz checkout do código e configura Node.js 18.x com cache de dependências.
   - Executa a suíte de testes automatizados ([`auth-service/test.js`](./auth-service/test.js) e [`catalog-service/test.js`](./catalog-service/test.js)).
   - Valida a integridade do contrato OpenAPI 3.0, módulos e regras de autorização RBAC.
2. **CD (Continuous Delivery & Packaging):**
   - Configura o Docker Buildx.
   - Gera tags rastreáveis atreladas ao commit SHA (ex: `sha-abc1234`) além da tag `latest`.
   - Constrói as imagens Docker de `auth-service` e `catalog-service`.
   - Valida a integridade da stack no `docker compose build`.

### Gestão Segura de Segredos:
- Nenhuma credencial (senhas de banco de dados, API keys do TMDB, credenciais SMTP) fica gravada no código, YAMLs ou Dockerfiles.
- As variáveis são injetadas estritamente em tempo de execução através do ambiente do **Portainer** ou **GitHub Secrets**.

---

## 🩺 6. Observabilidade: Health Checks e Métricas

### Health Checks (`/health` com Liveness & Readiness de Verdade)
Ambos os microsserviços expõem o endpoint `/health` que realiza testes reais em suas dependências:
- **`auth-service`:** Testa conectividade ativa executando query no banco MariaDB/MySQL.
- **`catalog-service`:** Testa a conectividade com o banco MariaDB e a comunicação de rede interna com o `auth-service`.
- **Status de Resposta:**
  - `HTTP 200 OK`: Serviço saudável (`"status": "UP"`).
  - `HTTP 503 Service Unavailable`: Falha em dependência crítica (`"status": "DOWN"`).

### Monitoramento no Docker (`HEALTHCHECK`)
Os contêineres possuem `healthcheck` configurado no [`docker-compose.yml`](./docker-compose.yml), permitindo que o Docker e o Portainer reportem o status do contêiner como `(healthy)` automaticamente via `docker ps`:
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) process.exit(1); })"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### Métricas Prometheus (`/metrics`)
O endpoint `/metrics` expõe métricas em formato padrão consumível pelo **Prometheus**:
- `http_requests_total{method, path, status}`: Contagem total de requisições por rota e código de status.
- `http_request_duration_seconds`: Latência média das requisições.
- `process_uptime_seconds`: Tempo de atividade do processo.
- `process_resident_memory_bytes` / `process_heap_bytes`: Consumo de memória da aplicação.

---

## 🔐 7. Controle de Acesso por Papel (RBAC)

O sistema implementa o modelo **RBAC (Role-Based Access Control)** com enforcement centralizado no backend (Padrão A).

| Recurso / Ação | Endpoint / Método | Papel `usuario` | Papel `admin` | Regra de Autorização |
| :--- | :--- | :---: | :---: | :--- |
| **Autenticação** | `/api/register`<br>`/api/login`<br>`/api/forgot-password` | ✅ Permitido | ✅ Permitido | Login, cadastro e recuperação de senha. |
| **Catálogo de Filmes** | `GET /api/movies` | ✅ Permitido | ✅ Permitido | Listagem de filmes via TMDB API. |
| **Favoritos** | `GET /api/favorites`<br>`POST /api/favorites` | ✅ Até 3 (Free) / Ilimitado (Premium) | ✅ Permitido | Gerenciar filmes favoritos próprios. |
| **Comentar em Filmes** | `POST /api/comments`<br>`GET /api/comments` | ✅ Permitido | ✅ Permitido | Postar e visualizar comentários da comunidade. |
| **Excluir Próprio Comentário** | `DELETE /api/comments/:id` | ✅ Permitido | ✅ Permitido | O usuário pode excluir apenas seu próprio comentário. |
| **Moderação de Comentários** | `DELETE /api/comments/:id` | ❌ **403 Forbidden** | ✅ Permitido | **Ação Exclusiva:** Administrador pode moderar/excluir qualquer comentário. |
| **Listar Todos os Usuários** | `GET /api/users` | ❌ **403 Forbidden** | ✅ Permitido | **Ação Exclusiva:** Painel restrito a administradores. |
| **Alterar Papel de Usuário** | `PATCH /api/users/:id/role` | ❌ **403 Forbidden** | ✅ Permitido | **Ação Exclusiva:** Promover/rebaixar papéis no sistema. |

---

## 🚀 8. Como Executar Localmente

```bash
# 1. Clonar o repositório
git clone https://github.com/glaffamabili/catalogo-tom-hanks.git
cd catalogo-tom-hanks

# 2. Executar testes automatizados
cd auth-service && npm test && cd ../catalog-service && npm test && cd ..

# 3. Subir os serviços com Docker Compose
docker compose up -d --build
```
- Aplicação Web: `http://localhost:8200`
- Swagger UI: `http://localhost:8200/apidocs`
- Health Check: `http://localhost:8200/health`
- Métricas: `http://localhost:8200/metrics`
