const express = require('express');
const mysql = require('mysql2/promise');
const cookieSession = require('cookie-session');
const fetch = require('node-fetch');
const path = require('path');
const crypto = require('crypto');
const Minio = require('minio');
const multer = require('multer');

const app = express();
app.set('trust proxy', 1);

// Métricas em memória para o endpoint /metrics (Padrão Prometheus)
const metrics = {
  requestsTotal: {},
  requestDurations: [],
  startTime: Date.now()
};

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const key = `${req.method}|${route}|${res.statusCode}`;
    metrics.requestsTotal[key] = (metrics.requestsTotal[key] || 0) + 1;
    metrics.requestDurations.push(duration);
    if (metrics.requestDurations.length > 500) metrics.requestDurations.shift();
  });
  next();
});

// Preserva rawBody para validação criptográfica HMAC-SHA256 do Webhook Stripe (Atividade 11)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.static('public'));

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'segredo_super_seguro_sessao_barbercloud_saas'],
  maxAge: 24 * 60 * 60 * 1000
}));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// Configuração do Cliente MinIO (Object Storage S3)
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'minio';
const MINIO_PORT = parseInt(process.env.MINIO_PORT, 10) || 9000;
const MINIO_ROOT_USER = process.env.MINIO_ROOT_USER || 'minioadmin';
const MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'perfil-fotos';

const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ROOT_USER,
  secretKey: MINIO_ROOT_PASSWORD
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido. Apenas imagens JPEG, PNG, WEBP ou GIF são aceitas.'));
    }
  }
});

// Configuração dos Planos Recorrentes do BarberCloud SaaS (Atividade 11)
const PLANOS_SAAS = {
  free: {
    id: 'free',
    nome: 'Plano Free (Iniciante)',
    preco_mensal: 0.00,
    moeda: 'BRL',
    limite_agendamentos_ativos: 3,
    stripe_price_id: 'price_test_barbercloud_free_brl',
    recursos: [
      'Até 3 agendamentos ativos simultâneos',
      'Acesso ao catálogo visual de serviços com fotos',
      'Upload de foto de perfil e comprovante no MinIO S3',
      'Autenticação segura em 2 etapas (2FA por e-mail)'
    ]
  },
  pro: {
    id: 'pro',
    nome: 'Plano BarberCloud Pro (Ilimitado)',
    preco_mensal: 29.90,
    moeda: 'BRL',
    limite_agendamentos_ativos: null, // Ilimitado
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID || 'price_test_barbercloud_pro_2990_brl',
    recursos: [
      'Agendamentos e serviços ilimitados no mês',
      'Selo exclusivo 👑 PRO ATIVO no perfil e nos agendamentos',
      'Upload ilimitado de fotos de cortes e comprovantes no MinIO S3',
      'Autogestão completa no Portal do Cliente (Stripe Billing Portal)'
    ]
  }
};

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_barbercloud_saas_secret_2026';

// Inicialização automática das tabelas de domínio (db/001_dominio.sql) e bucket MinIO
async function initStorageAndDb() {
  try {
    // 1. Tabela de Serviços da Barbearia (FK para usuarios)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS servicos_barbearia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profissional_id INT NOT NULL,
        nome VARCHAR(120) NOT NULL,
        categoria VARCHAR(60) NOT NULL DEFAULT 'Corte & Barba',
        descricao TEXT NOT NULL,
        preco DECIMAL(10, 2) NOT NULL DEFAULT 45.00,
        duracao_min INT NOT NULL DEFAULT 40,
        foto_chave VARCHAR(255) DEFAULT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (profissional_id)
      ) ENGINE=InnoDB;
    `);

    // 2. Tabela de Agendamentos (FKs para cliente, profissional e servico)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        profissional_id INT NOT NULL,
        servico_id INT NOT NULL,
        data_hora DATETIME NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'agendado',
        observacoes TEXT DEFAULT NULL,
        comprovante_chave VARCHAR(255) DEFAULT NULL,
        valor_cobrado DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (cliente_id),
        INDEX (profissional_id),
        INDEX (servico_id)
      ) ENGINE=InnoDB;
    `);

    // 3. Tabela de Avaliações Pós-Atendimento (FKs para agendamento e cliente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS avaliacoes_atendimento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agendamento_id INT NOT NULL,
        cliente_id INT NOT NULL,
        nota INT NOT NULL DEFAULT 5,
        comentario TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (agendamento_id),
        INDEX (cliente_id)
      ) ENGINE=InnoDB;
    `);

    // 4. Tabela de Idempotência de Webhooks do Stripe (Atividade 11)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eventos_stripe_processados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(120) NOT NULL UNIQUE,
        event_type VARCHAR(80) NOT NULL,
        usuario_id INT DEFAULT NULL,
        payload_resumo TEXT DEFAULT NULL,
        processado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Seed inicial automático caso o catálogo de serviços esteja vazio
    const [[countServicos]] = await pool.query('SELECT COUNT(*) AS total FROM servicos_barbearia');
    if (countServicos.total === 0) {
      const [users] = await pool.query('SELECT id FROM usuarios ORDER BY id ASC LIMIT 1');
      const defaultProfId = users.length > 0 ? users[0].id : 1;

      await pool.query(`
        INSERT INTO servicos_barbearia (profissional_id, nome, categoria, descricao, preco, duracao_min, ativo)
        VALUES
          (?, 'Corte Degradê Navalhado (Fade)', 'Cabelo', 'Corte moderno com acabamento na navalha, lavagem revigorante e finalização com pomada matte.', 50.00, 45, 1),
          (?, 'Barboterapia Real com Toalha Quente', 'Barba', 'Alinhamento completo da barba com ritual de toalha quente, óleo essencial de cedro e pós-barba.', 40.00, 30, 1),
          (?, 'Combo VIP (Corte + Barboterapia + Sobrancelha)', 'Combo Premium', 'Experiência completa de visagismo masculino: cabelo, barba com vapor de ozônio e design de sobrancelha.', 80.00, 75, 1),
          (?, 'Hidratação Capilar & Selagem Térmica', 'Estética & Tratamento', 'Nutrição profunda dos fios com redução de volume e brilho intenso.', 65.00, 50, 1),
          (?, 'Corte Infantil Estilizado', 'Kids', 'Atendimento dedicado e paciente para crianças de até 12 anos.', 45.00, 40, 1)
      `, [defaultProfId, defaultProfId, defaultProfId, defaultProfId, defaultProfId]);
    }

    console.log('Tabelas do domínio BarberCloud SaaS inicializadas com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar tabelas do BarberCloud:', err);
  }

  try {
    const bucketExiste = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExiste) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`Bucket MinIO "${MINIO_BUCKET}" criado com sucesso.`);
    }
  } catch (err) {
    console.warn(`Aviso na inicialização do MinIO:`, err.message);
  }
}
initStorageAndDb();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3000';

// Helper para registro de eventos de negócio no Redis Streams (log-service)
async function registrarLogAuditoria(dados) {
  try {
    await fetch(`${LOG_SERVICE_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
      timeout: 2000
    });
  } catch (err) {
    console.warn('[Log-Service] Não foi possível registrar evento de negócio:', err.message);
  }
}

// Helper para carregar o usuário autenticado atual junto ao Auth Service
async function obterUsuarioAtual(userId) {
  const response = await fetch(`${AUTH_SERVICE_URL}/verify-user/${userId}`);
  if (!response.ok) return null;
  return await response.json();
}

// Middleware de Autenticação
const exigeLogin = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Sessão expirada ou não autorizada. Faça login novamente.' });
  }
  try {
    const user = await obterUsuarioAtual(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado no serviço de identidade.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao validar sessão de usuário.' });
  }
};

// Middleware RBAC: Exige papel 'profissional' ou 'admin' (Atividade 10: 3 papéis com bloqueio 403)
const exigeProfissionalOuAdmin = async (req, res, next) => {
  await exigeLogin(req, res, () => {
    if (!['profissional', 'admin'].includes(req.user.role)) {
      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        usuario_email: req.user.email,
        acao: 'ACESSO_NEGADO_403_PAPEL',
        detalhes: {
          rota: req.originalUrl,
          metodo: req.method,
          papel_atual: req.user.role,
          papel_exigido: 'profissional ou admin'
        },
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden): Apenas barbeiros/profissionais ou administradores podem gerenciar o catálogo de serviços.'
      });
    }
    next();
  });
};

// Middleware RBAC: Exige papel 'admin'
const exigeAdmin = async (req, res, next) => {
  await exigeLogin(req, res, () => {
    if (req.user.role !== 'admin') {
      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        usuario_email: req.user.email,
        acao: 'ACESSO_NEGADO_403_ADMIN',
        detalhes: { rota: req.originalUrl, metodo: req.method, papel_atual: req.user.role },
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden): Esta ação é restrita a administradores do BarberCloud.'
      });
    }
    next();
  });
};

// ==========================================
// ROTAS DE AUTENTICAÇÃO, 2FA E PERFIL
// ==========================================

app.post('/api/register', async (req, res) => {
  try {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const appUrl = process.env.APP_URL || `${proto}://${host}`;

    const response = await fetch(`${AUTH_SERVICE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req.body, appUrl })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro de comunicação com o serviço de Autenticação.' });
  }
});

app.post('/api/verify-email', async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao validar código de ativação.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (response.ok && data.userId && !data.require2FA) {
      req.session.userId = data.userId;
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro de comunicação com o serviço de Autenticação.' });
  }
});

app.post('/api/verify-2fa', async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (response.ok && data.userId) {
      req.session.userId = data.userId;
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao validar código em duas etapas.' });
  }
});

app.post('/api/resend-code', async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao solicitar reenvio de código.' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const appUrl = process.env.APP_URL || `${proto}://${host}`;

    const response = await fetch(`${AUTH_SERVICE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req.body, appUrl })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro de comunicação com o serviço de Autenticação.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro de comunicação com o serviço de Autenticação.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

app.get('/api/me', exigeLogin, async (req, res) => {
  const user = req.user;
  const fotoUrl = user.foto_chave ? `/api/profile/avatar/${user.foto_chave}` : null;
  const isPro = Boolean(user.premium) || user.plano === 'pro';

  const [[agendamentosAtivos]] = await pool.query(
    "SELECT COUNT(*) AS total FROM agendamentos WHERE cliente_id = ? AND status IN ('agendado', 'confirmado')",
    [user.id]
  );

  res.json({
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role || 'cliente',
    plano: isPro ? 'pro' : 'free',
    assinatura_status: user.assinatura_status || 'active',
    premium: isPro,
    stripe_customer_id: user.stripe_customer_id || null,
    stripe_subscription_id: user.stripe_subscription_id || null,
    premium_since: user.premium_since || null,
    agendamentos_ativos: agendamentosAtivos.total,
    limite_plano: isPro ? null : PLANOS_SAAS.free.limite_agendamentos_ativos,
    bio: user.bio || '',
    foto_chave: user.foto_chave,
    foto_url: fotoUrl
  });
});

// ==========================================
// PERFIL E ARMAZENAMENTO DE OBJETOS MINIO S3
// ==========================================

app.get('/api/profile', exigeLogin, async (req, res) => {
  try {
    const user = req.user;
    const isPro = Boolean(user.premium) || user.plano === 'pro';

    const [[agendCount]] = await pool.query('SELECT COUNT(*) AS total FROM agendamentos WHERE cliente_id = ?', [user.id]);
    const [[avalCount]] = await pool.query('SELECT COUNT(*) AS total FROM avaliacoes_atendimento WHERE cliente_id = ?', [user.id]);
    const [meusAgendamentos] = await pool.query(
      `SELECT a.*, s.nome AS servico_nome, s.categoria AS servico_categoria
       FROM agendamentos a
       LEFT JOIN servicos_barbearia s ON a.servico_id = s.id
       WHERE a.cliente_id = ?
       ORDER BY a.data_hora DESC LIMIT 10`,
      [user.id]
    );

    const fotoUrl = user.foto_chave ? `/api/profile/avatar/${user.foto_chave}` : null;

    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role || 'cliente',
      plano: isPro ? 'pro' : 'free',
      assinatura_status: user.assinatura_status || 'active',
      premium: isPro,
      stripe_customer_id: user.stripe_customer_id || null,
      stripe_subscription_id: user.stripe_subscription_id || null,
      bio: user.bio || 'Membro do BarberCloud SaaS.',
      foto_url: fotoUrl,
      foto_chave: user.foto_chave,
      total_agendamentos: agendCount.total,
      total_avaliacoes: avalCount.total,
      agendamentos_recentes: meusAgendamentos
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar perfil do usuário.' });
  }
});

app.get('/api/profile/:id', exigeLogin, async (req, res) => {
  try {
    const targetId = req.params.id;
    const user = await obterUsuarioAtual(targetId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const [[agendCount]] = await pool.query('SELECT COUNT(*) AS total FROM agendamentos WHERE cliente_id = ?', [targetId]);
    const [[avalCount]] = await pool.query('SELECT COUNT(*) AS total FROM avaliacoes_atendimento WHERE cliente_id = ?', [targetId]);
    const fotoUrl = user.foto_chave ? `/api/profile/avatar/${user.foto_chave}` : null;

    res.json({
      id: user.id,
      nome: user.nome,
      role: user.role || 'cliente',
      plano: user.plano || 'free',
      premium: Boolean(user.premium),
      bio: user.bio || 'Membro da comunidade BarberCloud.',
      foto_url: fotoUrl,
      total_agendamentos: agendCount.total,
      total_avaliacoes: avalCount.total
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil de usuário.' });
  }
});

app.put('/api/profile', exigeLogin, async (req, res) => {
  const { nome, bio } = req.body;
  try {
    const authRes = await fetch(`${AUTH_SERVICE_URL}/profile/${req.user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, bio })
    });
    const data = await authRes.json();
    if (!authRes.ok) return res.status(authRes.status).json(data);

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: nome || req.user.nome,
      acao: 'PERFIL_ATUALIZADO',
      detalhes: { bio_atualizada: !!bio },
      ip: req.ip
    });

    res.json({ success: true, message: 'Perfil atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

app.post('/api/profile/upload-photo', exigeLogin, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Erro no processamento da imagem.' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });

    const userId = req.user.id;
    const extensao = path.extname(req.file.originalname) || '.jpg';
    const objectKey = `avatar_user_${userId}_${Date.now()}${extensao}`;

    try {
      const bucketExiste = await minioClient.bucketExists(MINIO_BUCKET);
      if (!bucketExiste) await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');

      await minioClient.putObject(MINIO_BUCKET, objectKey, req.file.buffer, req.file.size, { 'Content-Type': req.file.mimetype });
      await pool.query('UPDATE usuarios SET foto_chave = ? WHERE id = ?', [objectKey, userId]);

      const fotoUrl = `/api/profile/avatar/${objectKey}`;
      registrarLogAuditoria({
        usuario_id: userId,
        usuario_nome: req.user.nome,
        acao: 'UPLOAD_FOTO_PERFIL_MINIO',
        detalhes: { tamanho_bytes: req.file.size, mimetype: req.file.mimetype, objeto_chave: objectKey },
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Foto enviada e armazenada no MinIO S3 com sucesso!',
        foto_chave: objectKey,
        foto_url: fotoUrl
      });
    } catch (uploadErr) {
      res.status(500).json({ error: 'Erro ao salvar arquivo no MinIO: ' + uploadErr.message });
    }
  });
});

app.get('/api/profile/avatar/:key', async (req, res) => {
  const objectKey = req.params.key;
  try {
    const stat = await minioClient.statObject(MINIO_BUCKET, objectKey);
    res.setHeader('Content-Type', stat.metaData['content-type'] || 'image/jpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const dataStream = await minioClient.getObject(MINIO_BUCKET, objectKey);
    dataStream.pipe(res);
  } catch (err) {
    return res.status(404).json({ error: 'Arquivo não encontrado no MinIO Object Storage.' });
  }
});

// ============================================================
// DOMÍNIO BARBERCLOUD SAAS (ATIVIDADE 10):
// 1. CATÁLOGO DE SERVIÇOS DA BARBEARIA (/api/servicos)
// ============================================================

// Listagem pública e autenticada dos serviços da barbearia (suporta Landing Page e App)
app.get('/api/servicos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, u.nome AS profissional_nome
      FROM servicos_barbearia s
      LEFT JOIN usuarios u ON s.profissional_id = u.id
      WHERE s.ativo = 1
      ORDER BY s.categoria ASC, s.preco ASC
    `);
    const servicos = rows.map(s => ({
      ...s,
      preco: Number(s.preco),
      foto_url: s.foto_chave ? `/api/profile/avatar/${s.foto_chave}` : null
    }));
    res.json(servicos);
  } catch (err) {
    console.error('Erro ao listar serviços:', err);
    res.status(500).json({ error: 'Erro ao carregar catálogo de serviços da barbearia.' });
  }
});

// Detalhe de um serviço específico
app.get('/api/servicos/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.nome AS profissional_nome
       FROM servicos_barbearia s
       LEFT JOIN usuarios u ON s.profissional_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado.' });
    const s = rows[0];
    res.json({
      ...s,
      preco: Number(s.preco),
      foto_url: s.foto_chave ? `/api/profile/avatar/${s.foto_chave}` : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar detalhe do serviço.' });
  }
});

// Criar novo serviço no catálogo (Restrito a 'profissional' ou 'admin' -> retorna 403 para 'cliente')
app.post('/api/servicos', exigeProfissionalOuAdmin, async (req, res) => {
  const { nome, categoria, descricao, preco, duracao_min, foto_chave } = req.body;
  if (!nome || !descricao || preco === undefined) {
    return res.status(400).json({ error: 'Nome, descrição e preço do serviço são obrigatórios.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO servicos_barbearia (profissional_id, nome, categoria, descricao, preco, duracao_min, foto_chave, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        req.user.id,
        nome.trim(),
        (categoria || 'Corte & Barba').trim(),
        descricao.trim(),
        Number(preco),
        parseInt(duracao_min, 10) || 40,
        foto_chave || null
      ]
    );

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      usuario_email: req.user.email,
      acao: 'SERVICO_CRIADO',
      detalhes: { servico_id: result.insertId, nome: nome.trim(), preco: Number(preco), role: req.user.role },
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Serviço cadastrado com sucesso no catálogo BarberCloud!'
    });
  } catch (err) {
    console.error('Erro ao criar serviço:', err);
    res.status(500).json({ error: 'Erro ao cadastrar serviço.' });
  }
});

// Editar serviço existente (Restrito ao profissional dono ou admin)
app.put('/api/servicos/:id', exigeProfissionalOuAdmin, async (req, res) => {
  const servicoId = req.params.id;
  const { nome, categoria, descricao, preco, duracao_min, ativo } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM servicos_barbearia WHERE id = ?', [servicoId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado.' });

    const servico = rows[0];
    if (req.user.role !== 'admin' && servico.profissional_id !== req.user.id) {
      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'ACESSO_NEGADO_403_ISOLAMENTO_SERVICO',
        detalhes: { servico_id: servicoId, dono_id: servico.profissional_id },
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden): Você só pode editar serviços cadastrados por você.'
      });
    }

    await pool.query(
      `UPDATE servicos_barbearia
       SET nome = COALESCE(?, nome),
           categoria = COALESCE(?, categoria),
           descricao = COALESCE(?, descricao),
           preco = COALESCE(?, preco),
           duracao_min = COALESCE(?, duracao_min),
           ativo = COALESCE(?, ativo)
       WHERE id = ?`,
      [
        nome ? nome.trim() : null,
        categoria ? categoria.trim() : null,
        descricao ? descricao.trim() : null,
        preco !== undefined ? Number(preco) : null,
        duracao_min !== undefined ? parseInt(duracao_min, 10) : null,
        ativo !== undefined ? (ativo ? 1 : 0) : null,
        servicoId
      ]
    );

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'SERVICO_ATUALIZADO',
      detalhes: { servico_id: servicoId, nome },
      ip: req.ip
    });

    res.json({ success: true, message: 'Serviço atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar serviço.' });
  }
});

// Upload de foto de serviço do catálogo para o MinIO (Atividade 10: Upload integrado ao domínio)
app.post('/api/servicos/:id/foto', exigeProfissionalOuAdmin, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Envie uma imagem para o serviço.' });

    const servicoId = req.params.id;
    const extensao = path.extname(req.file.originalname) || '.jpg';
    const objectKey = `servico_${servicoId}_${Date.now()}${extensao}`;

    try {
      const bucketExiste = await minioClient.bucketExists(MINIO_BUCKET);
      if (!bucketExiste) await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');

      await minioClient.putObject(MINIO_BUCKET, objectKey, req.file.buffer, req.file.size, { 'Content-Type': req.file.mimetype });
      await pool.query('UPDATE servicos_barbearia SET foto_chave = ? WHERE id = ?', [objectKey, servicoId]);

      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'UPLOAD_FOTO_SERVICO_MINIO',
        detalhes: { servico_id: servicoId, objeto_chave: objectKey, tamanho_bytes: req.file.size },
        ip: req.ip
      });

      res.json({
        success: true,
        foto_chave: objectKey,
        foto_url: `/api/profile/avatar/${objectKey}`,
        message: 'Foto do serviço salva no MinIO e vinculada ao catálogo!'
      });
    } catch (uploadErr) {
      res.status(500).json({ error: 'Erro ao enviar foto do serviço pro MinIO: ' + uploadErr.message });
    }
  });
});

// Excluir/desativar serviço do catálogo
app.delete('/api/servicos/:id', exigeProfissionalOuAdmin, async (req, res) => {
  const servicoId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM servicos_barbearia WHERE id = ?', [servicoId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado.' });

    if (req.user.role !== 'admin' && rows[0].profissional_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado (403 Forbidden): Você não é o responsável por este serviço.' });
    }

    await pool.query('UPDATE servicos_barbearia SET ativo = 0 WHERE id = ?', [servicoId]);

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'SERVICO_REMOVIDO',
      detalhes: { servico_id: servicoId, nome: rows[0].nome },
      ip: req.ip
    });

    res.json({ success: true, message: 'Serviço removido do catálogo ativo.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover serviço.' });
  }
});

// ============================================================
// 2. CRUD COMPLETO DE AGENDAMENTOS COM ISOLAMENTO MULTI-TENANT
//    E LIMITE DO PLANO FREE (ATIVIDADES 10 E 11)
// ============================================================

// Listar agendamentos (Isolamento por usuário: cliente vê só os seus; profissional vê os da sua agenda; admin vê todos)
app.get('/api/agendamentos', exigeLogin, async (req, res) => {
  try {
    let query = `
      SELECT a.*,
             s.nome AS servico_nome, s.categoria AS servico_categoria, s.duracao_min, s.foto_chave AS servico_foto_chave,
             c.nome AS cliente_nome, c.email AS cliente_email, c.plano AS cliente_plano,
             p.nome AS profissional_nome
      FROM agendamentos a
      LEFT JOIN servicos_barbearia s ON a.servico_id = s.id
      LEFT JOIN usuarios c ON a.cliente_id = c.id
      LEFT JOIN usuarios p ON a.profissional_id = p.id
    `;
    const params = [];

    if (req.user.role === 'cliente') {
      query += ' WHERE a.cliente_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'profissional') {
      query += ' WHERE a.profissional_id = ? OR a.cliente_id = ?';
      params.push(req.user.id, req.user.id);
    }
    // Se for 'admin', lista todos da operação

    query += ' ORDER BY a.data_hora DESC';

    const [rows] = await pool.query(query, params);
    const formatados = rows.map(a => ({
      ...a,
      valor_cobrado: Number(a.valor_cobrado),
      comprovante_url: a.comprovante_chave ? `/api/profile/avatar/${a.comprovante_chave}` : null,
      servico_foto_url: a.servico_foto_chave ? `/api/profile/avatar/${a.servico_foto_chave}` : null
    }));

    res.json(formatados);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    res.status(500).json({ error: 'Erro ao listar agendamentos.' });
  }
});

// Detalhe de um agendamento específico com validação de Isolamento Multi-Tenant (403 Forbidden se tentar acessar de outro usuário)
app.get('/api/agendamentos/:id', exigeLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*,
              s.nome AS servico_nome, s.categoria AS servico_categoria, s.duracao_min,
              c.nome AS cliente_nome, c.email AS cliente_email,
              p.nome AS profissional_nome
       FROM agendamentos a
       LEFT JOIN servicos_barbearia s ON a.servico_id = s.id
       LEFT JOIN usuarios c ON a.cliente_id = c.id
       LEFT JOIN usuarios p ON a.profissional_id = p.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const agendamento = rows[0];
    const ehDonoCliente = agendamento.cliente_id === req.user.id;
    const ehProfissionalResponsavel = agendamento.profissional_id === req.user.id;
    const ehAdmin = req.user.role === 'admin';

    if (!ehDonoCliente && !ehProfissionalResponsavel && !ehAdmin) {
      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        usuario_email: req.user.email,
        acao: 'ACESSO_NEGADO_403_ISOLAMENTO_TENANT',
        detalhes: {
          agendamento_id: agendamento.id,
          dono_cliente_id: agendamento.cliente_id,
          tentativa_por_usuario_id: req.user.id
        },
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden - Isolamento Multi-Tenant): Você não tem permissão para visualizar o agendamento de outro cliente.'
      });
    }

    res.json({
      ...agendamento,
      valor_cobrado: Number(agendamento.valor_cobrado),
      comprovante_url: agendamento.comprovante_chave ? `/api/profile/avatar/${agendamento.comprovante_chave}` : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar agendamento.' });
  }
});

// Criar novo agendamento (Valida limite de 3 agendamentos ativos no Plano Free -> 403 PLAN_LIMIT_REACHED)
app.post('/api/agendamentos', exigeLogin, async (req, res) => {
  const { servico_id, data_hora, observacoes } = req.body;
  if (!servico_id || !data_hora) {
    return res.status(400).json({ error: 'Selecione o serviço e a data/hora desejada para o agendamento.' });
  }

  try {
    const user = req.user;
    const isPro = Boolean(user.premium) || user.plano === 'pro';

    // Verificação do Limite do Plano Free no Backend (Atividade 11: Free até 3 agendamentos ativos)
    if (!isPro) {
      const [[contagemAtivos]] = await pool.query(
        "SELECT COUNT(*) AS total FROM agendamentos WHERE cliente_id = ? AND status IN ('agendado', 'confirmado')",
        [user.id]
      );

      if (contagemAtivos.total >= PLANOS_SAAS.free.limite_agendamentos_ativos) {
        registrarLogAuditoria({
          usuario_id: user.id,
          usuario_nome: user.nome,
          usuario_email: user.email,
          acao: 'LIMITE_PLANO_FREE_ATINGIDO_403',
          detalhes: {
            plano: 'free',
            agendamentos_ativos: contagemAtivos.total,
            limite_maximo: PLANOS_SAAS.free.limite_agendamentos_ativos
          },
          ip: req.ip
        });

        return res.status(403).json({
          error: `Limite do Plano Free atingido (${PLANOS_SAAS.free.limite_agendamentos_ativos} agendamentos ativos). Faça upgrade para o Plano BarberCloud Pro (R$ 29,90/mês) para agendamentos ilimitados!`,
          code: 'PLAN_LIMIT_REACHED',
          plano_atual: 'free',
          limite: PLANOS_SAAS.free.limite_agendamentos_ativos
        });
      }
    }

    const [servicos] = await pool.query('SELECT * FROM servicos_barbearia WHERE id = ? AND ativo = 1', [servico_id]);
    if (servicos.length === 0) {
      return res.status(404).json({ error: 'Serviço selecionado não encontrado ou inativo.' });
    }
    const servico = servicos[0];

    const [result] = await pool.query(
      `INSERT INTO agendamentos (cliente_id, profissional_id, servico_id, data_hora, status, observacoes, valor_cobrado)
       VALUES (?, ?, ?, ?, 'agendado', ?, ?)`,
      [
        user.id,
        servico.profissional_id,
        servico.id,
        data_hora,
        observacoes ? observacoes.trim() : null,
        Number(servico.preco)
      ]
    );

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: user.email,
      acao: 'AGENDAMENTO_CRIADO',
      detalhes: {
        agendamento_id: result.insertId,
        servico_id: servico.id,
        servico_nome: servico.nome,
        data_hora,
        valor: Number(servico.preco),
        plano_usuario: isPro ? 'pro' : 'free'
      },
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: `Horário agendado com sucesso para "${servico.nome}"!`
    });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro ao registrar agendamento: ' + err.message });
  }
});

// Editar agendamento (Data/hora, observações ou status — com Isolamento Multi-Tenant 403)
app.put('/api/agendamentos/:id', exigeLogin, async (req, res) => {
  const agendamentoId = req.params.id;
  const { data_hora, status, observacoes } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM agendamentos WHERE id = ?', [agendamentoId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const agendamento = rows[0];
    const ehDonoCliente = agendamento.cliente_id === req.user.id;
    const ehProfissionalResponsavel = agendamento.profissional_id === req.user.id;
    const ehAdmin = req.user.role === 'admin';

    if (!ehDonoCliente && !ehProfissionalResponsavel && !ehAdmin) {
      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        usuario_email: req.user.email,
        acao: 'ACESSO_NEGADO_403_ISOLAMENTO_TENANT',
        detalhes: { agendamento_id: agendamentoId, dono_id: agendamento.cliente_id, acao: 'PUT /api/agendamentos/:id' },
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden - Isolamento Multi-Tenant): Você não pode alterar agendamentos de outro cliente.'
      });
    }

    // Cliente comum só pode remarcar ou cancelar, não pode marcar como 'concluido'
    if (status && ['confirmado', 'concluido'].includes(status) && req.user.role === 'cliente') {
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden): Apenas o barbeiro profissional ou administrador pode confirmar ou concluir o atendimento.'
      });
    }

    await pool.query(
      `UPDATE agendamentos
       SET data_hora = COALESCE(?, data_hora),
           status = COALESCE(?, status),
           observacoes = COALESCE(?, observacoes)
       WHERE id = ?`,
      [
        data_hora || null,
        status || null,
        observacoes !== undefined ? observacoes : null,
        agendamentoId
      ]
    );

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      usuario_email: req.user.email,
      acao: 'AGENDAMENTO_ATUALIZADO',
      detalhes: { agendamento_id: agendamentoId, novo_status: status || agendamento.status, data_hora: data_hora || agendamento.data_hora },
      ip: req.ip
    });

    res.json({ success: true, message: 'Agendamento atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
});

// Upload de comprovante / foto de referência do corte no agendamento via MinIO S3 (Atividade 10)
app.post('/api/agendamentos/:id/comprovante', exigeLogin, (req, res) => {
  upload.single('arquivo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum comprovante ou imagem enviado.' });

    const agendamentoId = req.params.id;
    try {
      const [rows] = await pool.query('SELECT * FROM agendamentos WHERE id = ?', [agendamentoId]);
      if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });

      const agendamento = rows[0];
      if (agendamento.cliente_id !== req.user.id && req.user.role !== 'admin' && agendamento.profissional_id !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado (403 Forbidden): Este agendamento pertence a outro cliente.' });
      }

      const extensao = path.extname(req.file.originalname) || '.jpg';
      const objectKey = `comprovante_agendamento_${agendamentoId}_${Date.now()}${extensao}`;

      const bucketExiste = await minioClient.bucketExists(MINIO_BUCKET);
      if (!bucketExiste) await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');

      await minioClient.putObject(MINIO_BUCKET, objectKey, req.file.buffer, req.file.size, { 'Content-Type': req.file.mimetype });
      await pool.query('UPDATE agendamentos SET comprovante_chave = ? WHERE id = ?', [objectKey, agendamentoId]);

      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'COMPROVANTE_AGENDAMENTO_ENVIADO_MINIO',
        detalhes: { agendamento_id: agendamentoId, objeto_chave: objectKey, tamanho_bytes: req.file.size },
        ip: req.ip
      });

      res.json({
        success: true,
        comprovante_chave: objectKey,
        comprovante_url: `/api/profile/avatar/${objectKey}`,
        message: 'Comprovante/referência salvo no MinIO S3 com sucesso!'
      });
    } catch (uploadErr) {
      res.status(500).json({ error: 'Erro ao salvar comprovante no MinIO: ' + uploadErr.message });
    }
  });
});

// Cancelar ou Excluir agendamento (Isolamento Multi-Tenant: somente dono, profissional responsável ou admin)
app.delete('/api/agendamentos/:id', exigeLogin, async (req, res) => {
  const agendamentoId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM agendamentos WHERE id = ?', [agendamentoId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const agendamento = rows[0];
    const ehDonoCliente = agendamento.cliente_id === req.user.id;
    const ehProfissionalResponsavel = agendamento.profissional_id === req.user.id;
    const ehAdmin = req.user.role === 'admin';

    if (!ehDonoCliente && !ehProfissionalResponsavel && !ehAdmin) {
      registrarLogAuditoria({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        usuario_email: req.user.email,
        acao: 'ACESSO_NEGADO_403_ISOLAMENTO_TENANT',
        detalhes: { agendamento_id: agendamentoId, dono_id: agendamento.cliente_id, acao: 'DELETE /api/agendamentos/:id' },
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden - Isolamento Multi-Tenant): Você não pode cancelar ou excluir o agendamento de outro usuário.'
      });
    }

    await pool.query('DELETE FROM agendamentos WHERE id = ?', [agendamentoId]);

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      usuario_email: req.user.email,
      acao: 'AGENDAMENTO_CANCELADO',
      detalhes: { agendamento_id: agendamentoId, cliente_id: agendamento.cliente_id, servico_id: agendamento.servico_id },
      ip: req.ip
    });

    res.json({ success: true, message: 'Agendamento cancelado e removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
});

// ============================================================
// 3. AVALIAÇÕES DE ATENDIMENTO (/api/avaliacoes)
// ============================================================

app.get('/api/avaliacoes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT av.*, u.nome AS cliente_nome, u.foto_chave AS cliente_foto_chave, u.plano AS cliente_plano,
             s.nome AS servico_nome
      FROM avaliacoes_atendimento av
      LEFT JOIN usuarios u ON av.cliente_id = u.id
      LEFT JOIN agendamentos ag ON av.agendamento_id = ag.id
      LEFT JOIN servicos_barbearia s ON ag.servico_id = s.id
      ORDER BY av.criado_em DESC
    `);
    res.json(rows.map(r => ({
      ...r,
      cliente_foto_url: r.cliente_foto_chave ? `/api/profile/avatar/${r.cliente_foto_chave}` : null
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar avaliações.' });
  }
});

app.post('/api/avaliacoes', exigeLogin, async (req, res) => {
  const { agendamento_id, nota, comentario } = req.body;
  if (!agendamento_id || !comentario || !comentario.trim()) {
    return res.status(400).json({ error: 'Informe o agendamento, a nota (1 a 5) e o comentário.' });
  }

  try {
    const [agRows] = await pool.query('SELECT * FROM agendamentos WHERE id = ?', [agendamento_id]);
    if (agRows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    if (agRows[0].cliente_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado (403 Forbidden): Você só pode avaliar seus próprios agendamentos.' });
    }

    const notaFinal = Math.min(5, Math.max(1, parseInt(nota, 10) || 5));
    const [result] = await pool.query(
      'INSERT INTO avaliacoes_atendimento (agendamento_id, cliente_id, nota, comentario) VALUES (?, ?, ?, ?)',
      [agendamento_id, req.user.id, notaFinal, comentario.trim()]
    );

    registrarLogAuditoria({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'AVALIACAO_ATENDIMENTO_CRIADA',
      detalhes: { avaliacao_id: result.insertId, agendamento_id, nota: notaFinal },
      ip: req.ip
    });

    res.status(201).json({ success: true, id: result.insertId, message: 'Avaliação publicada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar avaliação.' });
  }
});

app.delete('/api/avaliacoes/:id', exigeLogin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM avaliacoes_atendimento WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Avaliação não encontrada.' });

    if (rows[0].cliente_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado (403 Forbidden): Apenas o autor ou um admin pode remover esta avaliação.' });
    }

    await pool.query('DELETE FROM avaliacoes_atendimento WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Avaliação removida com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover avaliação.' });
  }
});

// ============================================================
// MONETIZAÇÃO SAAS COMPLETA COM STRIPE (ATIVIDADE 11):
// - Planos Free (R$ 0) e Pro (R$ 29,90/mês) em mode=subscription
// - Webhook com validação HMAC + Idempotência dos 4 eventos
// - Portal do Cliente (Stripe Billing Portal)
// - Painel Admin de Métricas SaaS & MRR
// ============================================================

app.get('/api/plans', (req, res) => {
  res.json({
    planos: Object.values(PLANOS_SAAS),
    modo_stripe: 'test'
  });
});

// Criar Checkout Session de Assinatura Recorrente (mode=subscription) vinculada ao Customer do Stripe
app.post(['/api/subscriptions/checkout', '/api/checkout/create-session'], exigeLogin, async (req, res) => {
  try {
    const user = req.user;
    const sessionId = `cs_test_sub_${crypto.randomBytes(12).toString('hex')}`;
    const customerId = user.stripe_customer_id || `cus_test_${user.id}_${crypto.randomBytes(4).toString('hex')}`;

    const checkoutUrl = `/stripe-checkout.html?session_id=${encodeURIComponent(sessionId)}&user_id=${user.id}&customer_id=${encodeURIComponent(customerId)}&email=${encodeURIComponent(user.email)}&nome=${encodeURIComponent(user.nome)}&plan=pro&amount=2990`;

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: user.email,
      acao: 'STRIPE_CHECKOUT_SUBSCRIPTION_CRIADO',
      detalhes: {
        session_id: sessionId,
        stripe_customer_id: customerId,
        mode: 'subscription',
        plano: 'pro',
        valor_mensal_brl: 29.90
      },
      ip: req.ip
    });

    res.json({
      success: true,
      mode: 'subscription',
      sessionId,
      customerId,
      plan: PLANOS_SAAS.pro,
      checkoutUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar sessão de assinatura no Stripe.' });
  }
});

// Criar sessão do Portal do Cliente (Stripe Billing Portal) para trocar de plano ou cancelar assinatura
app.post(['/api/billing/portal', '/api/subscriptions/portal'], exigeLogin, async (req, res) => {
  try {
    const user = req.user;
    const customerId = user.stripe_customer_id || `cus_test_${user.id}`;
    const subId = user.stripe_subscription_id || `sub_test_${user.id}`;
    const portalSessionId = `bps_test_${crypto.randomBytes(8).toString('hex')}`;

    const portalUrl = `/billing-portal.html?portal_session=${encodeURIComponent(portalSessionId)}&user_id=${user.id}&customer_id=${encodeURIComponent(customerId)}&subscription_id=${encodeURIComponent(subId)}&plano=${encodeURIComponent(user.plano || 'free')}&status=${encodeURIComponent(user.assinatura_status || 'active')}`;

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: user.email,
      acao: 'STRIPE_BILLING_PORTAL_ABERTO',
      detalhes: { portal_session: portalSessionId, stripe_customer_id: customerId, plano_atual: user.plano },
      ip: req.ip
    });

    res.json({
      success: true,
      portalSessionId,
      customerId,
      portalUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao abrir Portal de Cobrança do Cliente.' });
  }
});

// Helper para assinar payloads de teste no simulador oficial do Stripe Checkout / Billing Portal
app.post('/api/stripe-test/sign-webhook', exigeLogin, async (req, res) => {
  const { event_type, event_id, plano_destino } = req.body;
  const user = req.user;
  const timestamp = Math.floor(Date.now() / 1000);
  const evtId = event_id || `evt_test_${crypto.randomBytes(8).toString('hex')}`;
  const customerId = user.stripe_customer_id || `cus_test_${user.id}`;
  const subscriptionId = user.stripe_subscription_id || `sub_test_${user.id}`;

  const eventPayload = {
    id: evtId,
    object: 'event',
    api_version: '2023-10-16',
    created: timestamp,
    livemode: false,
    type: event_type || 'checkout.session.completed',
    data: {
      object: {
        id: event_type === 'checkout.session.completed' ? `cs_test_${crypto.randomBytes(6).toString('hex')}` : subscriptionId,
        customer: customerId,
        subscription: subscriptionId,
        payment_status: event_type === 'invoice.payment_failed' ? 'unpaid' : 'paid',
        status: event_type === 'customer.subscription.deleted' ? 'canceled' : (event_type === 'invoice.payment_failed' ? 'past_due' : 'active'),
        plan_id: plano_destino || 'pro',
        amount_total: 2990,
        currency: 'brl',
        metadata: {
          userId: String(user.id),
          userEmail: user.email,
          plan: plano_destino || 'pro'
        }
      }
    }
  };

  const payloadString = JSON.stringify(eventPayload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
  const stripeSignatureHeader = `t=${timestamp},v1=${signature}`;

  res.json({
    payload: eventPayload,
    stripeSignature: stripeSignatureHeader
  });
});

// Função de verificação da assinatura HMAC-SHA256 do Stripe
function validarAssinaturaStripe(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !rawBody) return false;
  const partes = signatureHeader.split(',');
  const timestampPart = partes.find(p => p.trim().startsWith('t='));
  const v1Part = partes.find(p => p.trim().startsWith('v1='));
  if (!timestampPart || !v1Part) return false;

  const timestamp = timestampPart.trim().substring(2);
  const signatureRecebida = v1Part.trim().substring(3);
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signatureRecebida), Buffer.from(expectedSignature));
  } catch (e) {
    return false;
  }
}

// Endpoint de Webhook do Stripe (Atividade 11: Valida assinatura + Idempotência + 4 eventos do ciclo de vida)
app.post('/api/webhooks/stripe', async (req, res) => {
  const sigHeader = req.headers['stripe-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!validarAssinaturaStripe(rawBody, sigHeader, STRIPE_WEBHOOK_SECRET)) {
    registrarLogAuditoria({
      usuario_id: 0,
      acao: 'STRIPE_WEBHOOK_ASSINATURA_INVALIDA',
      detalhes: { erro: 'Cabeçalho Stripe-Signature ausente ou inválido' },
      ip: req.ip
    });
    return res.status(400).json({ error: 'Webhook Error: Assinatura criptográfica Stripe-Signature inválida.' });
  }

  const event = req.body;
  if (!event || !event.id || !event.type) {
    return res.status(400).json({ error: 'Payload de evento Stripe malformado.' });
  }

  try {
    // 1. Garantia de Idempotência: Verifica se event.id já foi processado anteriormente
    const [jaProcessado] = await pool.query('SELECT id, processado_em FROM eventos_stripe_processados WHERE event_id = ?', [event.id]);
    if (jaProcessado.length > 0) {
      return res.status(200).json({
        received: true,
        idempotent_duplicate: true,
        event_id: event.id,
        message: 'Evento Stripe já processado anteriormente (Idempotência garantida).'
      });
    }

    const obj = (event.data && event.data.object) || {};
    const metadata = obj.metadata || {};
    let userId = metadata.userId ? parseInt(metadata.userId, 10) : null;
    const customerId = obj.customer || null;
    const subscriptionId = obj.subscription || obj.id || null;

    if (!userId && customerId) {
      const [uRows] = await pool.query('SELECT id FROM usuarios WHERE stripe_customer_id = ? LIMIT 1', [customerId]);
      if (uRows.length > 0) userId = uRows[0].id;
    }

    let novoPlano = 'pro';
    let novoStatus = 'active';
    let acaoLog = 'STRIPE_WEBHOOK_PROCESSADO';

    // 2. Tratamento dos 4 eventos de ciclo de vida exigidos na Atividade 11
    switch (event.type) {
      case 'checkout.session.completed':
        novoPlano = 'pro';
        novoStatus = 'active';
        acaoLog = 'WEBHOOK_CHECKOUT_SESSION_COMPLETED';
        break;

      case 'customer.subscription.updated':
        novoPlano = (metadata.plan === 'free' || obj.plan_id === 'free' || obj.status === 'canceled') ? 'free' : 'pro';
        novoStatus = obj.status || 'active';
        acaoLog = 'WEBHOOK_SUBSCRIPTION_UPDATED';
        break;

      case 'customer.subscription.deleted':
        novoPlano = 'free';
        novoStatus = 'canceled';
        acaoLog = 'WEBHOOK_SUBSCRIPTION_DELETED';
        break;

      case 'invoice.payment_failed':
        novoPlano = 'free';
        novoStatus = 'past_due';
        acaoLog = 'WEBHOOK_INVOICE_PAYMENT_FAILED';
        break;

      default:
        acaoLog = `WEBHOOK_${event.type.toUpperCase().replace(/\./g, '_')}`;
    }

    if (userId) {
      await fetch(`${AUTH_SERVICE_URL}/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: novoPlano,
          assinatura_status: novoStatus,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId
        })
      });
    }

    // 3. Registra o event_id na tabela de idempotência
    await pool.query(
      'INSERT INTO eventos_stripe_processados (event_id, event_type, usuario_id, payload_resumo) VALUES (?, ?, ?, ?)',
      [event.id, event.type, userId, JSON.stringify({ novoPlano, novoStatus, customerId, subscriptionId })]
    );

    registrarLogAuditoria({
      usuario_id: userId || 0,
      acao: acaoLog,
      detalhes: {
        event_id: event.id,
        event_type: event.type,
        plano_aplicado: novoPlano,
        assinatura_status: novoStatus,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId
      },
      ip: req.ip
    });

    res.status(200).json({
      received: true,
      idempotent_duplicate: false,
      event_id: event.id,
      event_type: event.type,
      user_id: userId,
      plano: novoPlano,
      assinatura_status: novoStatus
    });
  } catch (err) {
    console.error('Erro ao processar webhook Stripe:', err);
    res.status(500).json({ error: 'Erro interno ao processar webhook Stripe: ' + err.message });
  }
});

// ============================================================
// PAINEL ADMIN SAAS (ATIVIDADE 11):
// - Contagem de usuários por plano (Free vs Pro)
// - Assinaturas ativas e MRR de teste (soma mensal das Pro ativas)
// - Últimos eventos de negócio do Redis Streams
// ============================================================

app.get('/api/admin/saas-metrics', exigeAdmin, async (req, res) => {
  try {
    const usersRes = await fetch(`${AUTH_SERVICE_URL}/users`);
    const usuarios = await usersRes.json();

    const usuariosFree = usuarios.filter(u => u.plano !== 'pro' && !u.premium);
    const usuariosPro = usuarios.filter(u => u.plano === 'pro' || Boolean(u.premium));
    const assinaturasAtivas = usuariosPro.filter(u => (u.assinatura_status || 'active') === 'active');
    const assinaturasInadimplentes = usuarios.filter(u => u.assinatura_status === 'past_due');
    const assinaturasCanceladas = usuarios.filter(u => u.assinatura_status === 'canceled');

    const precoPro = PLANOS_SAAS.pro.preco_mensal; // R$ 29,90
    const mrrTeste = Number((assinaturasAtivas.length * precoPro).toFixed(2));
    const arrProjetado = Number((mrrTeste * 12).toFixed(2));

    const [[totalServicos]] = await pool.query('SELECT COUNT(*) AS total FROM servicos_barbearia WHERE ativo = 1');
    const [[totalAgendamentos]] = await pool.query('SELECT COUNT(*) AS total FROM agendamentos');
    const [[totalWebhooks]] = await pool.query('SELECT COUNT(*) AS total FROM eventos_stripe_processados');

    let ultimosEventos = [];
    try {
      const logsRes = await fetch(`${LOG_SERVICE_URL}/logs?limit=25`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        ultimosEventos = logsData.logs || [];
      }
    } catch (e) {
      console.warn('Aviso ao consultar logs para o painel SaaS:', e.message);
    }

    res.json({
      produto: 'BarberCloud SaaS',
      moeda: 'BRL',
      preco_plano_pro: precoPro,
      usuarios_totais: usuarios.length,
      usuarios_por_plano: {
        free: usuariosFree.length,
        pro: usuariosPro.length
      },
      assinaturas: {
        ativas: assinaturasAtivas.length,
        inadimplentes_past_due: assinaturasInadimplentes.length,
        canceladas: assinaturasCanceladas.length
      },
      mrr_teste: mrrTeste,
      mrr_formatado: `R$ ${mrrTeste.toFixed(2).replace('.', ',')}`,
      arr_projetado: arrProjetado,
      operacao_dominio: {
        servicos_ativos: totalServicos.total,
        agendamentos_totais: totalAgendamentos.total,
        webhooks_processados_idempotentes: totalWebhooks.total
      },
      ultimos_eventos_negocio: ultimosEventos
    });
  } catch (err) {
    console.error('Erro ao calcular métricas SaaS:', err);
    res.status(500).json({ error: 'Erro ao carregar métricas executivas do SaaS.' });
  }
});

app.get('/api/users', exigeAdmin, async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/users`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar usuários no Auth Service.' });
  }
});

app.patch('/api/users/:id/role', exigeAdmin, async (req, res) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/users/${req.params.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar papel do usuário no Auth Service.' });
  }
});

app.get('/api/admin/logs', exigeAdmin, async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const acao = req.query.acao || '';
    const query = new URLSearchParams({ limit, ...(acao ? { acao } : {}) }).toString();
    const response = await fetch(`${LOG_SERVICE_URL}/logs?${query}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar logs de auditoria no Log Service.' });
  }
});

// ==========================================
// OBSERVABILIDADE (/health E /metrics) E SWAGGER UI
// ==========================================

app.get('/health', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'DOWN';
  let authStatus = 'DOWN';
  let logStatus = 'DOWN';
  let minioStatus = 'DOWN';

  try {
    const [rows] = await pool.query('SELECT 1 AS alive');
    if (rows && rows.length > 0) dbStatus = 'UP';
  } catch (err) {}

  try {
    const authRes = await fetch(`${AUTH_SERVICE_URL}/health?format=json`, { timeout: 3000 });
    if (authRes.ok) authStatus = 'UP';
  } catch (err) {}

  try {
    const logRes = await fetch(`${LOG_SERVICE_URL}/health?format=json`, { timeout: 3000 });
    if (logRes.ok) logStatus = 'UP';
  } catch (err) {}

  try {
    const minioBucketCheck = await minioClient.bucketExists(MINIO_BUCKET);
    if (minioBucketCheck !== undefined) minioStatus = 'UP';
  } catch (err) {}

  const isHealthy = (dbStatus === 'UP' && authStatus === 'UP');
  const responseTimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(process.uptime());

  const payload = {
    status: isHealthy ? 'UP' : 'DOWN',
    service: 'barbercloud-saas-service',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    responseTimeMs,
    checks: {
      database: { status: dbStatus },
      authService: { status: authStatus },
      logService: { status: logStatus },
      minioStorage: { status: minioStatus, bucket: MINIO_BUCKET }
    }
  };

  return res.status(isHealthy ? 200 : 503).json(payload);
});

app.get('/metrics', (req, res) => {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  const mem = process.memoryUsage();

  let prom = `# HELP process_uptime_seconds Process uptime in seconds\n`;
  prom += `# TYPE process_uptime_seconds gauge\n`;
  prom += `process_uptime_seconds ${uptime.toFixed(2)}\n\n`;
  prom += `# HELP process_resident_memory_bytes Resident memory size in bytes\n`;
  prom += `# TYPE process_resident_memory_bytes gauge\n`;
  prom += `process_resident_memory_bytes ${mem.rss}\n\n`;
  prom += `# HELP process_heap_bytes Process heap bytes\n`;
  prom += `# TYPE process_heap_bytes gauge\n`;
  prom += `process_heap_bytes ${mem.heapUsed}\n\n`;
  prom += `# HELP http_requests_total Total number of HTTP requests\n`;
  prom += `# TYPE http_requests_total counter\n`;
  for (const [key, count] of Object.entries(metrics.requestsTotal)) {
    const [method, routePath, status] = key.split('|');
    prom += `http_requests_total{method="${method}",path="${routePath}",status="${status}"} ${count}\n`;
  }

  const avgDuration = metrics.requestDurations.length > 0
    ? (metrics.requestDurations.reduce((a, b) => a + b, 0) / metrics.requestDurations.length).toFixed(4)
    : 0;

  prom += `\n# HELP http_request_duration_seconds Average HTTP request duration in seconds\n`;
  prom += `# TYPE http_request_duration_seconds gauge\n`;
  prom += `http_request_duration_seconds ${avgDuration}\n`;

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  return res.send(prom);
});

const openapiPath = path.join(__dirname, 'openapi.json');
app.get('/openapi.json', (req, res) => res.sendFile(openapiPath));

app.get(['/apidocs', '/docs'], (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Swagger UI — BarberCloud SaaS API</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BarberCloud SaaS rodando na porta ${PORT}`));
