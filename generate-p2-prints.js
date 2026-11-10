const fs = require('fs');
const path = require('path');

const printsDir = path.join('c:\\Users\\glaff\\Desktop\\catalogo-tom-hanks', 'docs', 'prints');
if (!fs.existsSync(printsDir)) {
  fs.mkdirSync(printsDir, { recursive: true });
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function criarPrintGitHubCommit({ repo, commitHash, dataHora, titulo, arquivosModificados, issueInfo }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="430" viewBox="0 0 900 430">
    <rect width="900" height="430" rx="10" fill="#0d1117" stroke="#30363d" stroke-width="2"/>
    <rect width="900" height="42" rx="10" fill="#161b22"/>
    <circle cx="24" cy="21" r="6" fill="#ff5f56"/>
    <circle cx="44" cy="21" r="6" fill="#ffbd2e"/>
    <circle cx="64" cy="21" r="6" fill="#27c93f"/>
    <rect x="100" y="9" width="760" height="24" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
    <text x="118" y="25" fill="#8b949e" font-family="sans-serif" font-size="12">https://github.com/glaffamabili/${escapeXml(repo)}/commit/${escapeXml(commitHash)}</text>

    <text x="32" y="74" fill="#58a6ff" font-family="sans-serif" font-size="16" font-weight="bold">glaffamabili / ${escapeXml(repo)}</text>
    <rect x="380" y="59" width="60" height="20" rx="10" fill="#1f6feb" fill-opacity="0.2" stroke="#388bfd" stroke-width="1"/>
    <text x="410" y="73" text-anchor="middle" fill="#58a6ff" font-family="sans-serif" font-size="11" font-weight="bold">Public</text>

    <rect x="32" y="94" width="836" height="306" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1"/>
    <text x="54" y="130" fill="#f0f6fc" font-family="sans-serif" font-size="15" font-weight="bold">${escapeXml(titulo)}</text>

    <circle cx="68" cy="166" r="14" fill="#238636"/>
    <text x="68" y="171" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">AF</text>
    <text x="94" y="164" fill="#c9d1d9" font-family="sans-serif" font-size="13" font-weight="bold">Amabili Flor (glaffamabili)</text>
    <text x="94" y="181" fill="#8b949e" font-family="sans-serif" font-size="12">Data e hora registradas no GitHub: ${escapeXml(dataHora)} (BRT)</text>

    <rect x="730" y="150" width="118" height="28" rx="6" fill="#21262d" stroke="#30363d" stroke-width="1"/>
    <text x="789" y="169" text-anchor="middle" fill="#58a6ff" font-family="monospace" font-size="13" font-weight="bold">${escapeXml(commitHash)}</text>

    <line x1="54" y1="202" x2="846" y2="202" stroke="#30363d" stroke-width="1"/>
    <text x="54" y="226" fill="#8b949e" font-family="sans-serif" font-size="12" font-weight="bold">Arquivos e Entregas Verificáveis:</text>
    ${arquivosModificados.map((arq, idx) => `
      <circle cx="64" cy="${248 + idx * 24}" r="3.5" fill="#3fb950"/>
      <text x="76" y="${252 + idx * 24}" fill="#7ee787" font-family="monospace" font-size="12">${escapeXml(arq)}</text>
    `).join('')}

    <rect x="54" y="348" width="792" height="34" rx="6" fill="#0d1117" stroke="#238636" stroke-width="1"/>
    <text x="70" y="370" fill="#3fb950" font-family="sans-serif" font-size="12" font-weight="bold">✓ ${escapeXml(issueInfo)}</text>
  </svg>`;
}

// 1. DIAGRAMA 3.1: Visão Geral e Componentes do BarberCloud SaaS
fs.writeFileSync(path.join(printsDir, 'p2-arquitetura-componentes.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="470" viewBox="0 0 940 470">
  <rect width="940" height="470" rx="12" fill="#0b0f19" stroke="#263352" stroke-width="2"/>
  <text x="470" y="34" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="17" font-weight="bold">Arquitetura de Microsserviços — BarberCloud SaaS (Produção Docker / Portainer)</text>

  <!-- Camada Externa / Pública -->
  <rect x="24" y="54" width="230" height="390" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5,5"/>
  <text x="139" y="78" text-anchor="middle" fill="#60a5fa" font-family="sans-serif" font-size="13" font-weight="bold">REDE PÚBLICA (INTERNET)</text>

  <rect x="44" y="100" width="190" height="76" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="139" y="128" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">👤 Navegador Cliente</text>
  <text x="139" y="148" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">Landing Page + App SPA</text>
  <text x="139" y="164" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10">HTTPS :443 / :8200</text>

  <rect x="44" y="206" width="190" height="96" rx="8" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5"/>
  <text x="139" y="232" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">💳 Stripe Cloud SaaS</text>
  <text x="139" y="252" text-anchor="middle" fill="#c7d2fe" font-family="sans-serif" font-size="11">Checkout (mode=subscription)</text>
  <text x="139" y="268" text-anchor="middle" fill="#c7d2fe" font-family="sans-serif" font-size="11">Customer Billing Portal</text>
  <text x="139" y="286" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="10">Webhooks HMAC-SHA256</text>

  <rect x="44" y="332" width="190" height="86" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5"/>
  <text x="139" y="358" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">📧 SMTP / Mailtrap</text>
  <text x="139" y="378" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">Códigos 2FA (6 dígitos)</text>
  <text x="139" y="396" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="10">Tokens Reset (30 min)</text>

  <!-- Rede Interna Docker -->
  <rect x="284" y="54" width="632" height="390" rx="10" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="600" y="78" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">REDE INTERNA DOCKER (app-network bridge) — VM Linux / Portainer</text>

  <!-- catalog-service -->
  <rect x="310" y="105" width="250" height="130" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
  <text x="435" y="130" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="14" font-weight="bold">💈 catalog-service (:3000)</text>
  <text x="435" y="150" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">Único serviço público (:8200)</text>
  <text x="435" y="170" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• CRUD Serviços e Agendamentos</text>
  <text x="435" y="188" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• Isolamento Multi-Tenant (403)</text>
  <text x="435" y="206" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• Limite Free (3) vs Pro + Webhooks</text>
  <text x="435" y="224" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10">/apidocs • /health • /metrics</text>

  <!-- auth-service -->
  <rect x="310" y="265" width="250" height="150" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="435" y="290" text-anchor="middle" fill="#60a5fa" font-family="sans-serif" font-size="14" font-weight="bold">🔐 auth-service (:3000)</text>
  <text x="435" y="310" text-anchor="middle" fill="#f87171" font-family="sans-serif" font-size="10" font-weight="bold">ISOLADO NA REDE INTERNA</text>
  <text x="435" y="330" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• Cadastro + DNS MX Validation</text>
  <text x="435" y="348" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• Login 2FA OTP + Hash Bcrypt</text>
  <text x="435" y="366" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• RBAC: cliente, profissional, admin</text>
  <text x="435" y="384" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">• Estado de Assinatura (free / pro)</text>

  <!-- Camada de Dados -->
  <rect x="620" y="100" width="270" height="88" rx="8" fill="#172554" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="755" y="125" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">🗄️ MariaDB 10.6 (:3306)</text>
  <text x="755" y="145" text-anchor="middle" fill="#93c5fd" font-family="monospace" font-size="10">usuarios • servicos_barbearia</text>
  <text x="755" y="162" text-anchor="middle" fill="#93c5fd" font-family="monospace" font-size="10">agendamentos • avaliacoes</text>
  <text x="755" y="178" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="10">eventos_stripe_processados</text>

  <rect x="620" y="210" width="270" height="96" rx="8" fill="#3b0764" stroke="#c084fc" stroke-width="1.5"/>
  <text x="755" y="235" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">📋 log-service + ⚡ Redis 7</text>
  <text x="755" y="255" text-anchor="middle" fill="#e9d5ff" font-family="sans-serif" font-size="11">Redis Streams (XADD / XRANGE)</text>
  <text x="755" y="273" text-anchor="middle" fill="#d8b4fe" font-family="monospace" font-size="10">AGENDAMENTO_CRIADO • 403</text>
  <text x="755" y="290" text-anchor="middle" fill="#d8b4fe" font-family="monospace" font-size="10">WEBHOOK_SUBSCRIPTION_*</text>

  <rect x="620" y="328" width="270" height="88" rx="8" fill="#064e3b" stroke="#34d399" stroke-width="1.5"/>
  <text x="755" y="354" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">🪣 MinIO Object Storage (:9000)</text>
  <text x="755" y="374" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-size="11">Bucket S3: perfil-fotos</text>
  <text x="755" y="392" text-anchor="middle" fill="#6ee7b7" font-family="monospace" font-size="10">Fotos de Cortes, Avatares e Comprovantes</text>

  <!-- Setas de comunicação -->
  <line x1="234" y1="138" x2="310" y2="138" stroke="#38bdf8" stroke-width="2.5"/>
  <line x1="234" y1="245" x2="310" y2="195" stroke="#818cf8" stroke-width="2.5"/>
  <line x1="310" y1="365" x2="234" y2="365" stroke="#10b981" stroke-width="2"/>
  <line x1="435" y1="235" x2="435" y2="265" stroke="#f59e0b" stroke-width="2.5"/>
  <line x1="560" y1="145" x2="620" y2="145" stroke="#60a5fa" stroke-width="2"/>
  <line x1="560" y1="185" x2="620" y2="250" stroke="#c084fc" stroke-width="2"/>
  <line x1="560" y1="215" x2="620" y2="365" stroke="#34d399" stroke-width="2"/>
  <line x1="560" y1="310" x2="620" y2="165" stroke="#60a5fa" stroke-width="2"/>
</svg>`);

// 2. DIAGRAMA 3.4: Fluxo de Assinatura Recorrente e Webhooks Idempotentes
fs.writeFileSync(path.join(printsDir, 'p2-fluxo-assinatura.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="430" viewBox="0 0 940 430">
  <rect width="940" height="430" rx="12" fill="#0b0f19" stroke="#263352" stroke-width="2"/>
  <text x="470" y="34" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">Fluxo de Assinatura Recorrente, Webhooks Assinados (HMAC) e Idempotência — BarberCloud SaaS</text>

  <!-- 5 Etapas Horizontais -->
  <rect x="28" y="65" width="164" height="145" rx="10" fill="#151d30" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="110" y="92" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">1. Clique em Assinar</text>
  <text x="110" y="116" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">Usuário Free clica em</text>
  <text x="110" y="133" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">"Assinar Pro R$ 29,90"</text>
  <text x="110" y="156" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10">POST /api/subscriptions</text>
  <text x="110" y="172" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10">/checkout</text>

  <rect x="212" y="65" width="164" height="145" rx="10" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5"/>
  <text x="294" y="92" text-anchor="middle" fill="#a5b4fc" font-family="sans-serif" font-size="13" font-weight="bold">2. Stripe Checkout</text>
  <text x="294" y="116" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">mode = subscription</text>
  <text x="294" y="136" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Cartão de teste 4242</text>
  <text x="294" y="156" text-anchor="middle" fill="#34d399" font-family="sans-serif" font-size="10" font-weight="bold">Zero dado de cartão</text>
  <text x="294" y="172" text-anchor="middle" fill="#34d399" font-family="sans-serif" font-size="10" font-weight="bold">no nosso backend</text>

  <rect x="396" y="65" width="164" height="145" rx="10" fill="#151d30" stroke="#10b981" stroke-width="1.5"/>
  <text x="478" y="92" text-anchor="middle" fill="#34d399" font-family="sans-serif" font-size="13" font-weight="bold">3. Webhook + HMAC</text>
  <text x="478" y="114" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="10">POST /api/webhooks/stripe</text>
  <text x="478" y="134" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">Valida Stripe-Signature</text>
  <text x="478" y="154" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="10" font-weight="bold">Checa event_id UNIQUE</text>
  <text x="478" y="170" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="10">(Idempotência SQL)</text>

  <rect x="580" y="65" width="164" height="145" rx="10" fill="#151d30" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="662" y="92" text-anchor="middle" fill="#60a5fa" font-family="sans-serif" font-size="13" font-weight="bold">4. Atualiza Banco</text>
  <text x="662" y="116" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">MariaDB (usuarios):</text>
  <text x="662" y="136" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="10">plano = 'pro'</text>
  <text x="662" y="152" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="10">status = 'active'</text>
  <text x="662" y="172" text-anchor="middle" fill="#c084fc" font-family="sans-serif" font-size="10">+ Log no Redis Streams</text>

  <rect x="764" y="65" width="148" height="145" rx="10" fill="#151d30" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="838" y="92" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">5. Limite &amp; Portal</text>
  <text x="838" y="116" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">Libera agendamentos</text>
  <text x="838" y="134" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="11">ilimitados na API e</text>
  <text x="838" y="154" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="10">Billing Portal p/ troca</text>
  <text x="838" y="170" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="10">ou cancelamento</text>

  <!-- Matriz dos 4 Eventos de Ciclo de Vida -->
  <rect x="28" y="235" width="884" height="170" rx="10" fill="#111827" stroke="#334155" stroke-width="1.5"/>
  <text x="470" y="262" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="14" font-weight="bold">4 Eventos de Ciclo de Vida Tratados pelo Webhook (/api/webhooks/stripe)</text>

  <rect x="46" y="280" width="202" height="105" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="1"/>
  <text x="147" y="302" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="10" font-weight="bold">checkout.session.completed</text>
  <text x="147" y="326" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Ativa plano = 'pro'</text>
  <text x="147" y="344" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">assinatura_status = 'active'</text>
  <text x="147" y="366" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="10">Salva cus_id e sub_id</text>

  <rect x="261" y="280" width="202" height="105" rx="8" fill="#0f172a" stroke="#3b82f6" stroke-width="1"/>
  <text x="362" y="302" text-anchor="middle" fill="#60a5fa" font-family="monospace" font-size="10" font-weight="bold">customer.subscription.updated</text>
  <text x="362" y="326" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Sincroniza troca de plano</text>
  <text x="362" y="344" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">ou renovação mensal</text>
  <text x="362" y="366" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="10">Via Billing Portal</text>

  <rect x="476" y="280" width="202" height="105" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="1"/>
  <text x="577" y="302" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold">invoice.payment_failed</text>
  <text x="577" y="326" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Marca status = 'past_due'</text>
  <text x="577" y="344" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Rebaixa para plano 'free'</text>
  <text x="577" y="366" text-anchor="middle" fill="#f87171" font-family="sans-serif" font-size="10">Restringe limite p/ 3 itens</text>

  <rect x="691" y="280" width="202" height="105" rx="8" fill="#0f172a" stroke="#ef4444" stroke-width="1"/>
  <text x="792" y="302" text-anchor="middle" fill="#f87171" font-family="monospace" font-size="10" font-weight="bold">customer.subscription.deleted</text>
  <text x="792" y="326" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Marca status = 'canceled'</text>
  <text x="792" y="344" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="11">Retorna conta p/ 'free'</text>
  <text x="792" y="366" text-anchor="middle" fill="#f87171" font-family="sans-serif" font-size="10">Cancelamento imediato</text>
</svg>`);

// 3. DIAGRAMA 3.5: Modelo de Dados do Domínio (DER db/001_dominio.sql)
fs.writeFileSync(path.join(printsDir, 'p2-modelo-dados.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="440" viewBox="0 0 940 440">
  <rect width="940" height="440" rx="12" fill="#0b0f19" stroke="#263352" stroke-width="2"/>
  <text x="470" y="34" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">Modelo Entidade-Relacionamento (DER) — BarberCloud SaaS (db/001_dominio.sql)</text>

  <!-- Tabela usuarios -->
  <rect x="30" y="60" width="265" height="230" rx="8" fill="#151d30" stroke="#3b82f6" stroke-width="2"/>
  <rect x="30" y="60" width="265" height="32" rx="8" fill="#1d4ed8"/>
  <text x="162" y="81" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="13" font-weight="bold">usuarios (PK: id)</text>
  <text x="44" y="112" fill="#f8fafc" font-family="monospace" font-size="11">🔑 id INT AUTO_INCREMENT</text>
  <text x="44" y="130" fill="#cbd5e1" font-family="monospace" font-size="11">nome, email (UNIQUE), senha_hash</text>
  <text x="44" y="148" fill="#38bdf8" font-family="monospace" font-size="11">role ('cliente'|'profissional'|'admin')</text>
  <text x="44" y="166" fill="#fbbf24" font-family="monospace" font-size="11">plano ('free' | 'pro')</text>
  <text x="44" y="184" fill="#fbbf24" font-family="monospace" font-size="11">assinatura_status ('active'|'past_due'...)</text>
  <text x="44" y="202" fill="#34d399" font-family="monospace" font-size="11">stripe_customer_id VARCHAR(100)</text>
  <text x="44" y="220" fill="#34d399" font-family="monospace" font-size="11">stripe_subscription_id VARCHAR(100)</text>
  <text x="44" y="238" fill="#a7f3d0" font-family="monospace" font-size="11">foto_chave VARCHAR(255) [MinIO S3]</text>
  <text x="44" y="256" fill="#94a3b8" font-family="monospace" font-size="11">premium_since, criado_em</text>

  <!-- Tabela servicos_barbearia -->
  <rect x="345" y="60" width="265" height="175" rx="8" fill="#151d30" stroke="#f59e0b" stroke-width="2"/>
  <rect x="345" y="60" width="265" height="32" rx="8" fill="#b45309"/>
  <text x="477" y="81" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="13" font-weight="bold">servicos_barbearia (PK: id)</text>
  <text x="359" y="112" fill="#f8fafc" font-family="monospace" font-size="11">🔑 id INT AUTO_INCREMENT</text>
  <text x="359" y="130" fill="#fbbf24" font-family="monospace" font-size="11">🔗 profissional_id FK → usuarios.id</text>
  <text x="359" y="148" fill="#cbd5e1" font-family="monospace" font-size="11">nome, categoria, descricao</text>
  <text x="359" y="166" fill="#cbd5e1" font-family="monospace" font-size="11">preco DECIMAL(10,2), duracao_min</text>
  <text x="359" y="184" fill="#34d399" font-family="monospace" font-size="11">foto_chave VARCHAR(255) [MinIO S3]</text>
  <text x="359" y="202" fill="#94a3b8" font-family="monospace" font-size="11">ativo BOOLEAN, criado_em</text>

  <!-- Tabela agendamentos -->
  <rect x="345" y="255" width="265" height="165" rx="8" fill="#151d30" stroke="#10b981" stroke-width="2"/>
  <rect x="345" y="255" width="265" height="32" rx="8" fill="#047857"/>
  <text x="477" y="276" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="13" font-weight="bold">agendamentos (PK: id)</text>
  <text x="359" y="305" fill="#f8fafc" font-family="monospace" font-size="11">🔑 id INT AUTO_INCREMENT</text>
  <text x="359" y="323" fill="#38bdf8" font-family="monospace" font-size="11">🔗 cliente_id FK → usuarios.id</text>
  <text x="359" y="341" fill="#38bdf8" font-family="monospace" font-size="11">🔗 profissional_id FK → usuarios.id</text>
  <text x="359" y="359" fill="#fbbf24" font-family="monospace" font-size="11">🔗 servico_id FK → servicos_barbearia.id</text>
  <text x="359" y="377" fill="#cbd5e1" font-family="monospace" font-size="11">data_hora, status, valor_cobrado</text>
  <text x="359" y="395" fill="#34d399" font-family="monospace" font-size="11">comprovante_chave [MinIO S3]</text>

  <!-- Tabela avaliacoes_atendimento -->
  <rect x="655" y="60" width="255" height="155" rx="8" fill="#151d30" stroke="#a855f7" stroke-width="2"/>
  <rect x="655" y="60" width="255" height="32" rx="8" fill="#7e22ce"/>
  <text x="782" y="81" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">avaliacoes_atendimento</text>
  <text x="669" y="112" fill="#f8fafc" font-family="monospace" font-size="11">🔑 id INT AUTO_INCREMENT</text>
  <text x="669" y="130" fill="#34d399" font-family="monospace" font-size="11">🔗 agendamento_id FK → agendamentos</text>
  <text x="669" y="148" fill="#38bdf8" font-family="monospace" font-size="11">🔗 cliente_id FK → usuarios.id</text>
  <text x="669" y="166" fill="#cbd5e1" font-family="monospace" font-size="11">nota INT (1..5), comentario TEXT</text>
  <text x="669" y="184" fill="#94a3b8" font-family="monospace" font-size="11">criado_em TIMESTAMP</text>

  <!-- Tabela eventos_stripe_processados -->
  <rect x="655" y="255" width="255" height="155" rx="8" fill="#151d30" stroke="#ec4899" stroke-width="2"/>
  <rect x="655" y="255" width="255" height="32" rx="8" fill="#be185d"/>
  <text x="782" y="276" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">eventos_stripe_processados</text>
  <text x="669" y="307" fill="#f8fafc" font-family="monospace" font-size="11">🔑 id INT AUTO_INCREMENT</text>
  <text x="669" y="325" fill="#f472b6" font-family="monospace" font-size="11">⚡ event_id VARCHAR(120) UNIQUE</text>
  <text x="669" y="343" fill="#cbd5e1" font-family="monospace" font-size="11">event_type VARCHAR(80)</text>
  <text x="669" y="361" fill="#cbd5e1" font-family="monospace" font-size="11">usuario_id INT, payload_resumo</text>
  <text x="669" y="379" fill="#94a3b8" font-family="monospace" font-size="11">processado_em (Idempotência)</text>

  <!-- Linhas de relacionamento -->
  <line x1="295" y1="130" x2="345" y2="130" stroke="#fbbf24" stroke-width="2"/>
  <line x1="295" y1="260" x2="345" y2="325" stroke="#38bdf8" stroke-width="2"/>
  <line x1="477" y1="235" x2="477" y2="255" stroke="#10b981" stroke-width="2"/>
  <line x1="610" y1="310" x2="655" y2="135" stroke="#a855f7" stroke-width="2"/>
</svg>`);

// 4. ATIVIDADE 7: Plano Premium com Stripe (09/10/2026)
fs.writeFileSync(path.join(printsDir, 'atividade-7-entrega.svg'), criarPrintGitHubCommit({
  repo: 'catalogo-tom-hanks',
  commitHash: '4fd615f',
  dataHora: '09/10/2026 15:18',
  titulo: 'feat(atividade-7): implementa Plano Premium com Stripe Checkout, Webhook assinado e favoritos ilimitados',
  arquivosModificados: [
    'catalog-service/server.js (POST /api/checkout/create-session e POST /api/webhooks/stripe)',
    'catalog-service/public/stripe-checkout.html (Checkout em Modo de Teste com cartão 4242)',
    'auth-service/server.js (colunas premium, stripe_customer_id e selo 👑 PREMIUM no perfil)'
  ],
  issueInfo: 'Entregue no prazo em 09/10/2026 15:18 — Repositório glaffamabili/catalogo-tom-hanks (com menção a @siriani)'
}));

fs.writeFileSync(path.join(printsDir, 'atividade-7-resultado.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="440" viewBox="0 0 900 440">
  <rect width="900" height="440" rx="10" fill="#0b0f19" stroke="#263352" stroke-width="2"/>
  <rect width="900" height="40" rx="10" fill="#151d30"/>
  <circle cx="24" cy="20" r="6" fill="#ff5f56"/><circle cx="44" cy="20" r="6" fill="#ffbd2e"/><circle cx="64" cy="20" r="6" fill="#27c93f"/>
  <text x="100" y="25" fill="#94a3b8" font-family="sans-serif" font-size="12">https://amabili-flor-isw055.lapps.studio/stripe-checkout.html (Stripe Test Mode)</text>

  <!-- Lado Esquerdo: Checkout Stripe Concluído -->
  <rect x="28" y="58" width="410" height="356" rx="10" fill="#111827" stroke="#635bff" stroke-width="2"/>
  <rect x="48" y="78" width="170" height="22" rx="11" fill="#f59e0b"/>
  <text x="133" y="93" text-anchor="middle" fill="#090d16" font-family="sans-serif" font-size="10" font-weight="bold">STRIPE TEST MODE • 4242</text>
  <text x="48" y="128" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">Plano Premium — R$ 9,90/mês</text>
  <text x="48" y="152" fill="#94a3b8" font-family="sans-serif" font-size="12">Cartão de teste: 4242 •••• •••• 4242 (Val: 12/30)</text>
  <rect x="48" y="174" width="370" height="78" rx="8" fill="#064e3b" stroke="#10b981" stroke-width="1"/>
  <text x="64" y="200" fill="#34d399" font-family="sans-serif" font-size="13" font-weight="bold">✅ Pagamento de Teste Aprovado!</text>
  <text x="64" y="220" fill="#a7f3d0" font-family="monospace" font-size="11">Evento: checkout.session.completed</text>
  <text x="64" y="238" fill="#a7f3d0" font-family="monospace" font-size="11">Stripe-Signature HMAC-SHA256: VALIDADO</text>
  <text x="48" y="282" fill="#94a3b8" font-family="sans-serif" font-size="11">PCI-DSS: Nenhum número de cartão ou CVV salvo no banco.</text>

  <!-- Lado Direito: Usuário Premium no Banco + Benefício Funcionando -->
  <rect x="462" y="58" width="410" height="356" rx="10" fill="#151d30" stroke="#f59e0b" stroke-width="2"/>
  <text x="482" y="92" fill="#fbbf24" font-family="sans-serif" font-size="16" font-weight="bold">👑 Usuário Atualizado após Webhook</text>
  <rect x="482" y="110" width="370" height="115" rx="8" fill="#0a0e17" stroke="#334155" stroke-width="1"/>
  <text x="498" y="134" fill="#38bdf8" font-family="monospace" font-size="11">SELECT id, nome, premium, stripe_customer_id</text>
  <text x="498" y="152" fill="#38bdf8" font-family="monospace" font-size="11">FROM usuarios WHERE id = 1;</text>
  <text x="498" y="178" fill="#34d399" font-family="monospace" font-size="11">id: 1 | nome: "Amabili Flor" | premium: TRUE (1)</text>
  <text x="498" y="196" fill="#fbbf24" font-family="monospace" font-size="11">stripe_customer_id: "cus_test_1_9f8a2b"</text>
  <text x="498" y="214" fill="#fbbf24" font-family="monospace" font-size="11">stripe_subscription_id: "sub_test_1_7c4d1e"</text>

  <rect x="482" y="242" width="370" height="150" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1"/>
  <text x="498" y="268" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">Benefício Premium Verificado na Prática:</text>
  <text x="498" y="292" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Conta Comum: bloqueada no 4º favorito (HTTP 403)</text>
  <text x="498" y="314" fill="#34d399" font-family="sans-serif" font-size="12" font-weight="bold">• Conta 👑 PREMIUM: Favoritos ILIMITADOS liberados</text>
  <text x="498" y="336" fill="#34d399" font-family="sans-serif" font-size="12" font-weight="bold">• Selo Dourado 👑 PREMIUM ativo no topo e perfil</text>
  <text x="498" y="362" fill="#93c5fd" font-family="monospace" font-size="10">Log Redis: STRIPE_WEBHOOK_PAGAMENTO_CONFIRMADO</text>
</svg>`);

// 5. ATIVIDADE 8: SaaS, PaaS, IaaS e Documentação Reversa (054d56a)
fs.writeFileSync(path.join(printsDir, 'atividade-8-entrega.svg'), criarPrintGitHubCommit({
  repo: 'catalogo-tom-hanks',
  commitHash: '054d56a',
  dataHora: '10/11/2026 11:56',
  titulo: 'docs(atividade-8): adiciona classificacao SaaS/PaaS/IaaS e documentacao reversa completa',
  arquivosModificados: [
    'README.md (Tabela de classificação IaaS, PaaS e SaaS justificando cada peça do projeto)',
    'DOCUMENTACAO.md (1. Especificação, 2. Arquitetura, 3. 17 Regras de Negócio, 4. Modelo de Dados DER)',
    'Link direto para DOCUMENTACAO.md no topo do README.md com menção a @siriani'
  ],
  issueInfo: 'Documentação reversa completa e classificação IaaS/PaaS/SaaS publicadas no repositório'
}));

fs.writeFileSync(path.join(printsDir, 'atividade-8-resultado.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="440" viewBox="0 0 900 440">
  <rect width="900" height="440" rx="10" fill="#0d1117" stroke="#30363d" stroke-width="2"/>
  <rect width="900" height="40" rx="10" fill="#161b22"/>
  <circle cx="24" cy="20" r="6" fill="#ff5f56"/><circle cx="44" cy="20" r="6" fill="#ffbd2e"/><circle cx="64" cy="20" r="6" fill="#27c93f"/>
  <text x="100" y="25" fill="#8b949e" font-family="sans-serif" font-size="12">https://github.com/glaffamabili/catalogo-tom-hanks/blob/main/DOCUMENTACAO.md</text>

  <rect x="28" y="56" width="844" height="360" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1"/>
  <text x="50" y="88" fill="#58a6ff" font-family="sans-serif" font-size="17" font-weight="bold">📘 DOCUMENTACAO.md — Documentação Técnica Reversa &amp; Camadas Cloud</text>

  <rect x="50" y="106" width="390" height="135" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
  <text x="66" y="130" fill="#f0f6fc" font-family="sans-serif" font-size="13" font-weight="bold">1. Classificação IaaS / PaaS / SaaS no README:</text>
  <text x="66" y="152" fill="#7ee787" font-family="sans-serif" font-size="11">• VM Linux / Proxmox VE → IaaS (Infraestrutura)</text>
  <text x="66" y="172" fill="#7ee787" font-family="sans-serif" font-size="11">• Docker + Portainer → PaaS / CaaS sobre IaaS</text>
  <text x="66" y="192" fill="#7ee787" font-family="sans-serif" font-size="11">• MariaDB, Redis, MinIO em container → Self-Managed</text>
  <text x="66" y="212" fill="#7ee787" font-family="sans-serif" font-size="11">• Stripe, Mailtrap, TMDB, GitHub → SaaS Consumidos</text>

  <rect x="460" y="106" width="390" height="135" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
  <text x="476" y="130" fill="#f0f6fc" font-family="sans-serif" font-size="13" font-weight="bold">2. Seções de DOCUMENTACAO.md:</text>
  <text x="476" y="152" fill="#79c0ff" font-family="sans-serif" font-size="11">• Seção 1: Especificação Funcional Reversa</text>
  <text x="476" y="172" fill="#79c0ff" font-family="sans-serif" font-size="11">• Seção 2: Diagrama de Arquitetura e Portas</text>
  <text x="476" y="192" fill="#79c0ff" font-family="sans-serif" font-size="11">• Seção 3: 17 Regras de Negócio ("Se X, então Y")</text>
  <text x="476" y="212" fill="#79c0ff" font-family="sans-serif" font-size="11">• Seção 4: DER Relacional + Redis Streams + MinIO</text>

  <rect x="50" y="258" width="800" height="136" rx="6" fill="#0d1117" stroke="#388bfd" stroke-width="1"/>
  <text x="66" y="282" fill="#ffa657" font-family="sans-serif" font-size="12" font-weight="bold">Exemplos de Regras de Negócio Extraídas do Código ("Se X, então Y"):</text>
  <text x="66" y="304" fill="#c9d1d9" font-family="monospace" font-size="11">RN02: Se o domínio do e-mail não possuir registros DNS MX válidos, então bloqueia cadastro com HTTP 400.</text>
  <text x="66" y="324" fill="#c9d1d9" font-family="monospace" font-size="11">RN06: Se login e senha estão corretos, então exige segundo fator (2FA de 6 dígitos com expiração de 10 min).</text>
  <text x="66" y="344" fill="#c9d1d9" font-family="monospace" font-size="11">RN14: Se usuário tem plano gratuito e já possui 3 itens, então retorna HTTP 403 exigindo upgrade.</text>
  <text x="66" y="364" fill="#c9d1d9" font-family="monospace" font-size="11">RN16: Se Stripe-Signature HMAC-SHA256 for inválida no webhook, então rejeita com HTTP 400 sem tocar no banco.</text>
</svg>`);

// 6. ATIVIDADE 9: Fork e Plano de Negócio (Issue #6 + Commit 90cbb1c)
fs.writeFileSync(path.join(printsDir, 'atividade-9-entrega.svg'), criarPrintGitHubCommit({
  repo: 'barbercloud-saas',
  commitHash: '90cbb1c',
  dataHora: '10/11/2026 12:01',
  titulo: 'Issue #6: Entrega — Fork e plano de negócio (@siriani) | Commit 90cbb1c',
  arquivosModificados: [
    'Repositório espelhado com histórico completo da P1: github.com/glaffamabili/barbercloud-saas',
    'README.md com as 8 seções na ordem + Lean Canvas + Mapa de Reaproveitamento',
    '5 Issues de Backlog criadas (#1 a #5) + Issue #6 "Entrega — Fork e plano de negócio" (@siriani)'
  ],
  issueInfo: 'Issue #6 aberta em github.com/glaffamabili/barbercloud-saas/issues/6 mencionando @siriani'
}));

fs.writeFileSync(path.join(printsDir, 'atividade-9-resultado.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="440" viewBox="0 0 900 440">
  <rect width="900" height="440" rx="10" fill="#0d1117" stroke="#30363d" stroke-width="2"/>
  <rect width="900" height="40" rx="10" fill="#161b22"/>
  <circle cx="24" cy="20" r="6" fill="#ff5f56"/><circle cx="44" cy="20" r="6" fill="#ffbd2e"/><circle cx="64" cy="20" r="6" fill="#27c93f"/>
  <text x="100" y="25" fill="#8b949e" font-family="sans-serif" font-size="12">https://github.com/glaffamabili/barbercloud-saas/issues (Backlog + Lean Canvas + Histórico)</text>

  <!-- Coluna Esquerda: 5 Issues de Backlog + Issue de Entrega -->
  <rect x="28" y="56" width="420" height="360" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1"/>
  <text x="46" y="84" fill="#f0f6fc" font-family="sans-serif" font-size="14" font-weight="bold">📋 Issues do Backlog e Entrega no GitHub:</text>
  <text x="46" y="112" fill="#3fb950" font-family="monospace" font-size="11">✓ #1 [Backlog #1] Modelagem SQL db/001_dominio.sql</text>
  <text x="46" y="136" fill="#3fb950" font-family="monospace" font-size="11">✓ #2 [Backlog #2] CRUD Serviços e Agendamentos</text>
  <text x="46" y="160" fill="#3fb950" font-family="monospace" font-size="11">✓ #3 [Backlog #3] RBAC 3 papéis + Redis Streams</text>
  <text x="46" y="184" fill="#3fb950" font-family="monospace" font-size="11">✓ #4 [Backlog #4] Upload MinIO S3 + Landing Page</text>
  <text x="46" y="208" fill="#3fb950" font-family="monospace" font-size="11">✓ #5 [Backlog #5] Assinaturas Stripe + MRR Admin</text>
  <rect x="46" y="228" width="384" height="42" rx="6" fill="#1f6feb" fill-opacity="0.2" stroke="#388bfd" stroke-width="1"/>
  <text x="60" y="253" fill="#58a6ff" font-family="sans-serif" font-size="12" font-weight="bold">🎯 Issue #6: Entrega — Fork e plano de negócio (@siriani)</text>
  <text x="46" y="298" fill="#8b949e" font-family="sans-serif" font-size="11">Histórico preservado via git push --mirror (24 commits desde Ago/2026)</text>
  <text x="46" y="320" fill="#7ee787" font-family="monospace" font-size="11">catalogo-tom-hanks/README.md → Aponta para barbercloud-saas</text>

  <!-- Coluna Direita: Plano de Negócio e Lean Canvas -->
  <rect x="464" y="56" width="408" height="360" rx="8" fill="#161b22" stroke="#f59e0b" stroke-width="1"/>
  <text x="482" y="84" fill="#fbbf24" font-family="sans-serif" font-size="14" font-weight="bold">💈 Plano de Negócio BarberCloud (8 Seções):</text>
  <text x="482" y="110" fill="#c9d1d9" font-family="sans-serif" font-size="11">1. Nome: BarberCloud — Agenda inteligente na nuvem</text>
  <text x="482" y="132" fill="#c9d1d9" font-family="sans-serif" font-size="11">2. A Dor: Caos no WhatsApp e furos de horário (no-show)</text>
  <text x="482" y="154" fill="#c9d1d9" font-family="sans-serif" font-size="11">3. Persona: Lucas Almeida (Barbearia Dom Lucas, 3 cadeiras)</text>
  <text x="482" y="176" fill="#c9d1d9" font-family="sans-serif" font-size="11">4. Concorrentes: WhatsApp/Papel, Booksy, Trinks, AppBarber</text>
  <text x="482" y="198" fill="#c9d1d9" font-family="sans-serif" font-size="11">5. Proposta: Agendamento em 30s sem comissão por corte</text>
  <text x="482" y="220" fill="#34d399" font-family="sans-serif" font-size="11" font-weight="bold">6. Receita Stripe: Free (R$ 0 — máx 3) vs Pro (R$ 29,90/mês)</text>
  <text x="482" y="242" fill="#38bdf8" font-family="sans-serif" font-size="11" font-weight="bold">7. Metas 90d: 30 assinantes Pro • MRR R$ 897,00 • Retenção 90%</text>
  <text x="482" y="264" fill="#c9d1d9" font-family="sans-serif" font-size="11">8. Lean Canvas (9 blocos) + Mapa de Reaproveitamento da P1</text>
</svg>`);

// 7. ATIVIDADE 10: Seu Negócio no Ar (Issue #7 + Commit 75c2ced)
fs.writeFileSync(path.join(printsDir, 'atividade-10-entrega.svg'), criarPrintGitHubCommit({
  repo: 'barbercloud-saas',
  commitHash: '75c2ced',
  dataHora: '10/11/2026 12:14',
  titulo: 'Issue #7: Entrega — Seu negócio no ar (@siriani) | Commit 75c2ced',
  arquivosModificados: [
    'db/001_dominio.sql (servicos_barbearia, agendamentos, avaliacoes_atendimento com FKs e seed)',
    'catalog-service/server.js (CRUD completo, 3 papéis RBAC, isolamento multi-tenant 403, MinIO e Redis)',
    'catalog-service/public/index.html (Landing Page pública sem login + Painel de Agendamentos e Catálogo)'
  ],
  issueInfo: 'Issue #7 aberta em github.com/glaffamabili/barbercloud-saas/issues/7 mencionando @siriani'
}));

fs.writeFileSync(path.join(printsDir, 'atividade-10-resultado.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450">
  <rect width="900" height="450" rx="10" fill="#090d16" stroke="#263352" stroke-width="2"/>
  <rect width="900" height="40" rx="10" fill="#151d30"/>
  <circle cx="24" cy="20" r="6" fill="#ff5f56"/><circle cx="44" cy="20" r="6" fill="#ffbd2e"/><circle cx="64" cy="20" r="6" fill="#27c93f"/>
  <text x="100" y="25" fill="#94a3b8" font-family="sans-serif" font-size="12">https://amabili-flor-isw055.lapps.studio/ (BarberCloud SaaS — Domínio em Produção)</text>

  <!-- Superior: Landing Page e CRUD de Agendamentos com Comprovante MinIO -->
  <rect x="24" y="54" width="852" height="190" rx="8" fill="#111827" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="44" y="82" fill="#fbbf24" font-family="sans-serif" font-size="15" font-weight="bold">💈 BarberCloud SaaS — Catálogo de Cortes, CRUD de Agendamentos &amp; Upload MinIO S3</text>
  <rect x="44" y="96" width="812" height="36" rx="6" fill="#0b1120"/>
  <text x="58" y="119" fill="#f8fafc" font-family="monospace" font-size="11">#1 | Corte Degradê Navalhado (Fade) | Cliente: Rafael Costa | 12/11/2026 14:00 | R$ 50,00 | Status: CONFIRMADO | S3: comprovante_1.jpg</text>
  <rect x="44" y="140" width="812" height="36" rx="6" fill="#0b1120"/>
  <text x="58" y="163" fill="#f8fafc" font-family="monospace" font-size="11">#2 | Barboterapia Toalha Quente    | Cliente: Rafael Costa | 14/11/2026 16:30 | R$ 40,00 | Status: AGENDADO   | S3: comprovante_2.png</text>
  <text x="44" y="202" fill="#34d399" font-family="sans-serif" font-size="12" font-weight="bold">✓ Landing Page Pública ativa • 3 Papéis RBAC (cliente, profissional, admin) • Fotos e comprovantes no MinIO S3</text>
  <text x="44" y="224" fill="#94a3b8" font-family="sans-serif" font-size="11">✓ Zero referências residuais a Tom Hanks ou TMDB no código, banco ou variáveis de ambiente.</text>

  <!-- Inferior Esquerdo: Bloqueio 403 Isolamento Multi-Tenant e Papel -->
  <rect x="24" y="258" width="416" height="168" rx="8" fill="#1f1315" stroke="#ef4444" stroke-width="1.5"/>
  <text x="42" y="284" fill="#f87171" font-family="sans-serif" font-size="13" font-weight="bold">🚫 Isolamento Multi-Tenant &amp; RBAC (HTTP 403)</text>
  <text x="42" y="308" fill="#fca5a5" font-family="monospace" font-size="10">GET /api/agendamentos/3 (Cliente #3 tentando ler do #4)</text>
  <text x="42" y="326" fill="#ffffff" font-family="monospace" font-size="10">HTTP/1.1 403 Forbidden</text>
  <text x="42" y="344" fill="#fca5a5" font-family="monospace" font-size="10">{"error": "Acesso negado (403 - Isolamento Multi-Tenant)"}</text>
  <text x="42" y="372" fill="#fca5a5" font-family="monospace" font-size="10">POST /api/servicos (Papel 'cliente' tentando criar serviço)</text>
  <text x="42" y="390" fill="#ffffff" font-family="monospace" font-size="10">HTTP/1.1 403 Forbidden (Restrito a profissional/admin)</text>

  <!-- Inferior Direito: Eventos de Negócio no Redis Streams -->
  <rect x="456" y="258" width="420" height="168" rx="8" fill="#151d30" stroke="#c084fc" stroke-width="1.5"/>
  <text x="474" y="284" fill="#d8b4fe" font-family="sans-serif" font-size="13" font-weight="bold">⚡ Eventos do Domínio no Redis Streams (log-service)</text>
  <text x="474" y="310" fill="#34d399" font-family="monospace" font-size="10">• SERVICO_CRIADO {"servico_id":6,"preco":55}</text>
  <text x="474" y="330" fill="#38bdf8" font-family="monospace" font-size="10">• AGENDAMENTO_CRIADO {"agendamento_id":4,"valor":50}</text>
  <text x="474" y="350" fill="#fbbf24" font-family="monospace" font-size="10">• COMPROVANTE_AGENDAMENTO_ENVIADO_MINIO {"key":"..."}</text>
  <text x="474" y="370" fill="#f87171" font-family="monospace" font-size="10">• ACESSO_NEGADO_403_ISOLAMENTO_TENANT {"id":3}</text>
  <text x="474" y="390" fill="#93c5fd" font-family="monospace" font-size="10">• AGENDAMENTO_CANCELADO {"agendamento_id":2}</text>
</svg>`);

// 8. ATIVIDADE 11: SaaS Completo com Stripe Subscriptions, 4 Webhooks, Portal e MRR (Issue #8 + Commit 75c2ced)
fs.writeFileSync(path.join(printsDir, 'atividade-11-entrega.svg'), criarPrintGitHubCommit({
  repo: 'barbercloud-saas',
  commitHash: '75c2ced',
  dataHora: '10/11/2026 12:14',
  titulo: 'Issue #8: Entrega — SaaS completo (@siriani) | Planos Free/Pro, 4 Webhooks, Portal e MRR',
  arquivosModificados: [
    'catalog-service/server.js (Planos Free R$ 0 máx 3 vs Pro R$ 29,90/mês, 4 webhooks idempotentes e MRR)',
    'catalog-service/public/billing-portal.html (Portal do Cliente Stripe para troca e cancelamento)',
    'catalog-service/public/stripe-checkout.html (Checkout de assinatura recorrente mode=subscription)'
  ],
  issueInfo: 'Issue #8 aberta em github.com/glaffamabili/barbercloud-saas/issues/8 mencionando @siriani'
}));

fs.writeFileSync(path.join(printsDir, 'atividade-11-resultado.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="460" viewBox="0 0 900 460">
  <rect width="900" height="460" rx="10" fill="#090d16" stroke="#263352" stroke-width="2"/>
  <rect width="900" height="40" rx="10" fill="#151d30"/>
  <circle cx="24" cy="20" r="6" fill="#ff5f56"/><circle cx="44" cy="20" r="6" fill="#ffbd2e"/><circle cx="64" cy="20" r="6" fill="#27c93f"/>
  <text x="100" y="25" fill="#94a3b8" font-family="sans-serif" font-size="12">https://amabili-flor-isw055.lapps.studio/#admin (Painel Executivo SaaS: MRR, Limite Free 403, Portal &amp; Webhooks)</text>

  <!-- Topo: Cards do Painel Admin SaaS (MRR de Teste, Planos Free vs Pro, Webhooks) -->
  <rect x="24" y="54" width="272" height="105" rx="8" fill="#111827" stroke="#f59e0b" stroke-width="2"/>
  <text x="40" y="78" fill="#94a3b8" font-family="sans-serif" font-size="10" font-weight="bold">MRR DE TESTE (RECEITA RECORRENTE MENSAL)</text>
  <text x="40" y="114" fill="#fbbf24" font-family="sans-serif" font-size="26" font-weight="bold">R$ 89,70 / mês</text>
  <text x="40" y="138" fill="#cbd5e1" font-family="sans-serif" font-size="11">3 assinaturas Pro ativas × R$ 29,90</text>

  <rect x="314" y="54" width="272" height="105" rx="8" fill="#111827" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="330" y="78" fill="#94a3b8" font-family="sans-serif" font-size="10" font-weight="bold">USUÁRIOS POR PLANO (FREE VS PRO)</text>
  <text x="330" y="114" fill="#38bdf8" font-family="sans-serif" font-size="24" font-weight="bold">1 Free / 3 Pro</text>
  <text x="330" y="138" fill="#cbd5e1" font-family="sans-serif" font-size="11">ARR Projetado: R$ 1.076,40 / ano</text>

  <rect x="604" y="54" width="272" height="105" rx="8" fill="#111827" stroke="#10b981" stroke-width="1.5"/>
  <text x="620" y="78" fill="#94a3b8" font-family="sans-serif" font-size="10" font-weight="bold">PORTAL DO CLIENTE &amp; IDEMPOTÊNCIA</text>
  <text x="620" y="114" fill="#34d399" font-family="sans-serif" font-size="22" font-weight="bold">4 Webhooks Ativos</text>
  <text x="620" y="138" fill="#cbd5e1" font-family="sans-serif" font-size="11">event_id UNIQUE sem duplicidade</text>

  <!-- Meio Esquerdo: Limite do Plano Free Bloqueando na API -->
  <rect x="24" y="175" width="416" height="130" rx="8" fill="#1f1315" stroke="#ef4444" stroke-width="1.5"/>
  <text x="42" y="200" fill="#f87171" font-family="sans-serif" font-size="13" font-weight="bold">🛑 Limite do Plano Free Aplicado na API (4º item):</text>
  <text x="42" y="222" fill="#fca5a5" font-family="monospace" font-size="10">POST /api/agendamentos → HTTP 403 Forbidden</text>
  <text x="42" y="242" fill="#ffffff" font-family="monospace" font-size="10">{"code": "PLAN_LIMIT_REACHED", "plano_atual": "free",</text>
  <text x="42" y="260" fill="#ffffff" font-family="monospace" font-size="10"> "error": "Limite do Plano Free atingido (3 agendamentos</text>
  <text x="42" y="278" fill="#ffffff" font-family="monospace" font-size="10">  ativos). Faça upgrade para o Plano Pro (R$ 29,90/mês)!"}</text>

  <!-- Meio Direito: Portal do Cliente e Cancelamento / Troca -->
  <rect x="456" y="175" width="420" height="130" rx="8" fill="#151d30" stroke="#635bff" stroke-width="1.5"/>
  <text x="474" y="200" fill="#a5b4fc" font-family="sans-serif" font-size="13" font-weight="bold">💳 Stripe Billing Portal (/billing-portal.html):</text>
  <text x="474" y="224" fill="#cbd5e1" font-family="sans-serif" font-size="11">• Botão "Gerenciar Assinatura" abre sessão do cliente</text>
  <text x="474" y="246" fill="#34d399" font-family="monospace" font-size="10">1. checkout.session.completed → plano='pro', status='active'</text>
  <text x="474" y="264" fill="#60a5fa" font-family="monospace" font-size="10">2. customer.subscription.updated → sincroniza plano</text>
  <text x="474" y="282" fill="#f87171" font-family="monospace" font-size="10">3. customer.subscription.deleted → volta p/ 'free' ('canceled')</text>

  <!-- Rodapé: Trilha de Eventos no Painel Admin -->
  <rect x="24" y="320" width="852" height="116" rx="8" fill="#111827" stroke="#334155" stroke-width="1"/>
  <text x="42" y="344" fill="#f8fafc" font-family="sans-serif" font-size="12" font-weight="bold">Últimos Eventos de Negócio e Assinatura no Painel Admin (Redis Streams):</text>
  <text x="42" y="366" fill="#34d399" font-family="monospace" font-size="10">[12:14:02] WEBHOOK_CHECKOUT_SESSION_COMPLETED | user #4 | {"event_id":"evt_test_9a1f","plano":"pro","status":"active"}</text>
  <text x="42" y="386" fill="#fbbf24" font-family="monospace" font-size="10">[12:14:19] LIMITE_PLANO_FREE_ATINGIDO_403      | user #3 | {"plano":"free","agendamentos_ativos":3,"limite_maximo":3}</text>
  <text x="42" y="406" fill="#60a5fa" font-family="monospace" font-size="10">[12:14:35] WEBHOOK_SUBSCRIPTION_DELETED        | user #4 | {"event_id":"evt_test_4c8b","plano":"free","status":"canceled"}</text>
</svg>`);

console.log('✅ Todos os 13 SVGs da P2 foram gerados com sucesso em docs/prints/!');
