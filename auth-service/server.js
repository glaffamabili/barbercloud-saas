const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const path = require('path');

const app = express();
app.use(express.json());

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

const { wrapPoolWithFallback } = require('../db/resilient-pool');

const rawPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});
const pool = wrapPoolWithFallback(rawPool);

// Helper para envio de logs de auditoria para o Log Service (Redis Streams)
async function registrarLogAuditoria(dados) {
  try {
    const logHost = process.env.LOG_SERVICE_HOST || 'log-service';
    const logPort = process.env.LOG_SERVICE_PORT || 3000;
    const http = require('http');
    const postData = JSON.stringify(dados);
    const options = {
      hostname: logHost,
      port: logPort,
      path: '/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 2000
    };

    const req = http.request(options, () => {});
    req.on('error', () => {});
    req.write(postData);
    req.end();
  } catch (err) {
    console.warn('[Log-Service] Falha ao despachar log de auditoria:', err.message);
  }
}

// Papéis válidos do domínio BarberCloud SaaS (Atividade 10: no mínimo 3 papéis)
const PAPEIS_VALIDOS = ['cliente', 'profissional', 'admin'];

function normalizarRole(role) {
  if (!role) return 'cliente';
  const r = String(role).trim().toLowerCase();
  if (r === 'usuario') return 'cliente';
  if (r === 'barbeiro') return 'profissional';
  return PAPEIS_VALIDOS.includes(r) ? r : 'cliente';
}

// Inicialização automática e idempotente das tabelas do banco de dados
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        usuario_id INT NOT NULL,
        criado_em DATETIME NOT NULL,
        expira_em DATETIME NOT NULL,
        usado TINYINT(1) DEFAULT 0,
        INDEX (token)
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS codigos_autenticacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        codigo VARCHAR(10) NOT NULL,
        expira_em DATETIME NOT NULL,
        usado TINYINT(1) DEFAULT 0,
        tentativas INT DEFAULT 0,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (email, tipo, codigo),
        INDEX (usuario_id)
      ) ENGINE=InnoDB;
    `);

    // Verifica e adiciona colunas de papel, perfil e assinatura SaaS na tabela usuarios
    const colunasExtras = [
      { nome: 'role', ddl: "ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'cliente'" },
      { nome: 'bio', ddl: "ALTER TABLE usuarios ADD COLUMN bio TEXT NULL" },
      { nome: 'foto_chave', ddl: "ALTER TABLE usuarios ADD COLUMN foto_chave VARCHAR(255) NULL" },
      { nome: 'email_verificado', ddl: "ALTER TABLE usuarios ADD COLUMN email_verificado TINYINT(1) DEFAULT 1" },
      { nome: 'plano', ddl: "ALTER TABLE usuarios ADD COLUMN plano VARCHAR(20) DEFAULT 'free'" },
      { nome: 'assinatura_status', ddl: "ALTER TABLE usuarios ADD COLUMN assinatura_status VARCHAR(30) DEFAULT 'active'" },
      { nome: 'premium', ddl: "ALTER TABLE usuarios ADD COLUMN premium TINYINT(1) DEFAULT 0" },
      { nome: 'stripe_customer_id', ddl: "ALTER TABLE usuarios ADD COLUMN stripe_customer_id VARCHAR(100) NULL" },
      { nome: 'stripe_subscription_id', ddl: "ALTER TABLE usuarios ADD COLUMN stripe_subscription_id VARCHAR(100) NULL" },
      { nome: 'premium_since', ddl: "ALTER TABLE usuarios ADD COLUMN premium_since DATETIME NULL" }
    ];

    for (const col of colunasExtras) {
      const [rows] = await pool.query(`SHOW COLUMNS FROM usuarios LIKE '${col.nome}'`);
      if (rows.length === 0) {
        await pool.query(col.ddl);
      }
    }

    // Normaliza papéis legados 'usuario' para 'cliente'
    await pool.query("UPDATE usuarios SET role = 'cliente' WHERE role = 'usuario' OR role IS NULL");

    console.log('Banco de dados do Auth Service (BarberCloud SaaS) inicializado com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar tabelas do banco no Auth Service:', err);
  }
}
initDb();

function getTransporter() {
  const host = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: (user && pass) ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false }
  });
}

function getSenderAddress() {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@barbercloud.lapps.studio';
  return `"BarberCloud SaaS" <${fromEmail}>`;
}

// Validação Estrita de E-mail Real (Formato + Domínios Falsos + Resolução DNS MX)
async function validarEmailReal(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email.trim())) {
    return { valido: false, erro: 'Formato de e-mail inválido. Utilize um endereço no padrão nome@dominio.com.' };
  }

  const partes = email.trim().toLowerCase().split('@');
  const dominio = partes[1];

  const dominiosFalsos = [
    'teste.com', 'test.com', 'fake.com', 'exemplo.com', 'example.com',
    'asdf.com', 'naoexiste.com', 'email.com', 'teste.com.br', 'abc.com', 'temp.com'
  ];

  if (dominiosFalsos.includes(dominio)) {
    return { valido: false, erro: `O domínio "@${dominio}" não é aceito. Por favor, utilize seu endereço de e-mail real.` };
  }

  try {
    const mxRecords = await dns.resolveMx(dominio);
    if (!mxRecords || mxRecords.length === 0) {
      return { valido: false, erro: `O domínio "@${dominio}" não possui servidores de e-mail válidos (sem registros MX).` };
    }
  } catch (dnsErr) {
    const dominiosConfiaveis = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'uol.com.br', 'bol.com.br', 'live.com', 'lapps.studio', 'barbercloud.lapps.studio'];
    if (!dominiosConfiaveis.includes(dominio)) {
      return { valido: false, erro: `O domínio "@${dominio}" não existe ou não pode receber mensagens de e-mail.` };
    }
  }

  return { valido: true };
}

// 1. Cadastro com Validação de E-mail Real, Escolha de Papel (cliente/profissional) e Código de Ativação
app.post('/register', async (req, res) => {
  const { nome, email, senha, role } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Por favor, preencha nome, e-mail e senha.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres para sua segurança.' });
  }

  const checagemEmail = await validarEmailReal(email);
  if (!checagemEmail.valido) {
    return res.status(400).json({ error: checagemEmail.erro });
  }

  const cleanEmail = email.trim().toLowerCase();
  const userRole = normalizarRole(role);

  try {
    const [existentes] = await pool.query('SELECT id, email_verificado FROM usuarios WHERE email = ?', [cleanEmail]);
    if (existentes.length > 0) {
      const userExistente = existentes[0];
      if (userExistente.email_verificado === 1) {
        return res.status(400).json({ error: 'Este endereço de e-mail já está cadastrado. Faça login ou recupere sua senha.' });
      } else {
        const hash = await bcrypt.hash(senha, 10);
        await pool.query(
          'UPDATE usuarios SET nome = ?, senha_hash = ?, role = ?, plano = ? WHERE id = ?',
          [nome.trim(), hash, userRole, 'free', userExistente.id]
        );

        const codigoAtivacao = String(Math.floor(100000 + Math.random() * 900000));
        const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query('DELETE FROM codigos_autenticacao WHERE email = ? AND tipo = ?', [cleanEmail, 'EMAIL_VERIFICACAO']);
        await pool.query(
          'INSERT INTO codigos_autenticacao (usuario_id, email, tipo, codigo, expira_em) VALUES (?, ?, ?, ?, ?)',
          [userExistente.id, cleanEmail, 'EMAIL_VERIFICACAO', codigoAtivacao, expiraEm]
        );

        await enviarEmailCodigo({ to: cleanEmail, nome: nome.trim(), codigo: codigoAtivacao, tipo: 'EMAIL_VERIFICACAO' });

        registrarLogAuditoria({
          usuario_id: userExistente.id,
          usuario_nome: nome.trim(),
          usuario_email: cleanEmail,
          acao: 'CADASTRO_REENVIADO_CODIGO',
          detalhes: { role: userRole, plano: 'free' },
          ip: req.ip
        });

        return res.json({
          success: true,
          requireVerification: true,
          email: cleanEmail,
          role: userRole,
          message: 'Código de ativação enviado para o seu e-mail!'
        });
      }
    }

    const hash = await bcrypt.hash(senha, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, role, plano, assinatura_status, premium, email_verificado) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
      [nome.trim(), cleanEmail, hash, userRole, 'free', 'active']
    );
    const newUserId = result.insertId;

    const codigoAtivacao = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'INSERT INTO codigos_autenticacao (usuario_id, email, tipo, codigo, expira_em) VALUES (?, ?, ?, ?, ?)',
      [newUserId, cleanEmail, 'EMAIL_VERIFICACAO', codigoAtivacao, expiraEm]
    );

    await enviarEmailCodigo({ to: cleanEmail, nome: nome.trim(), codigo: codigoAtivacao, tipo: 'EMAIL_VERIFICACAO' });

    registrarLogAuditoria({
      usuario_id: newUserId,
      usuario_nome: nome.trim(),
      usuario_email: cleanEmail,
      acao: 'USUARIO_CADASTRADO_SAAS',
      detalhes: { role: userRole, plano: 'free', status: 'pendente_verificacao_email' },
      ip: req.ip
    });

    res.json({
      success: true,
      requireVerification: true,
      email: cleanEmail,
      role: userRole,
      message: 'Cadastro no BarberCloud realizado! Digite o código de 6 dígitos enviado ao seu e-mail.'
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    res.status(500).json({ error: 'Erro ao processar cadastro: ' + (err.sqlMessage || err.message) });
  }
});

// 2. Validação do Código de Ativação do E-mail
app.post('/verify-email', async (req, res) => {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ error: 'E-mail e código de ativação são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCodigo = String(codigo).trim();

  try {
    const [rows] = await pool.query(
      `SELECT * FROM codigos_autenticacao 
       WHERE email = ? AND tipo = 'EMAIL_VERIFICACAO' AND usado = 0 
       ORDER BY id DESC LIMIT 1`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Nenhum código de ativação pendente para este e-mail.' });
    }

    const regCodigo = rows[0];
    if (new Date() > new Date(regCodigo.expira_em)) {
      return res.status(400).json({ error: 'Código de ativação expirado. Clique em "Reenviar Código".' });
    }

    if (regCodigo.codigo !== cleanCodigo) {
      await pool.query('UPDATE codigos_autenticacao SET tentativas = tentativas + 1 WHERE id = ?', [regCodigo.id]);
      return res.status(400).json({ error: 'Código de ativação incorreto.' });
    }

    await pool.query('UPDATE codigos_autenticacao SET usado = 1 WHERE id = ?', [regCodigo.id]);
    await pool.query('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', [regCodigo.usuario_id]);

    const [userRows] = await pool.query('SELECT id, nome, email, role, plano FROM usuarios WHERE id = ?', [regCodigo.usuario_id]);
    const user = userRows[0];

    await enviarEmailBoasVindas(user.email, user.nome);

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: user.email,
      acao: 'EMAIL_VERIFICADO_SUCESSO',
      detalhes: { role: user.role, plano: user.plano },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Conta BarberCloud ativada com sucesso! Você já pode realizar seu login.'
    });
  } catch (err) {
    console.error('Erro na validação de e-mail:', err);
    res.status(500).json({ error: 'Erro ao validar e-mail: ' + err.message });
  }
});

// 3. Login com Verificação em Duas Etapas (2FA via E-mail OTP)
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [cleanEmail]);
    if (rows.length === 0) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const user = rows[0];
    const hashSalvo = user.senha_hash || user.senha;
    const match = await bcrypt.compare(senha, hashSalvo);
    if (!match) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    if (user.email_verificado === 0) {
      const codigoAtivacao = String(Math.floor(100000 + Math.random() * 900000));
      const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

      await pool.query('DELETE FROM codigos_autenticacao WHERE email = ? AND tipo = ?', [cleanEmail, 'EMAIL_VERIFICACAO']);
      await pool.query(
        'INSERT INTO codigos_autenticacao (usuario_id, email, tipo, codigo, expira_em) VALUES (?, ?, ?, ?, ?)',
        [user.id, cleanEmail, 'EMAIL_VERIFICACAO', codigoAtivacao, expiraEm]
      );

      await enviarEmailCodigo({ to: cleanEmail, nome: user.nome, codigo: codigoAtivacao, tipo: 'EMAIL_VERIFICACAO' });

      return res.status(403).json({
        error: 'Sua conta ainda não foi ativada. Enviamos um novo código para seu e-mail.',
        requireVerification: true,
        email: cleanEmail
      });
    }

    const codigo2FA = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM codigos_autenticacao WHERE email = ? AND tipo = ?', [cleanEmail, 'LOGIN_2FA']);
    await pool.query(
      'INSERT INTO codigos_autenticacao (usuario_id, email, tipo, codigo, expira_em) VALUES (?, ?, ?, ?, ?)',
      [user.id, cleanEmail, 'LOGIN_2FA', codigo2FA, expiraEm]
    );

    await enviarEmailCodigo({ to: cleanEmail, nome: user.nome, codigo: codigo2FA, tipo: 'LOGIN_2FA' });

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: cleanEmail,
      acao: 'LOGIN_2FA_SOLICITADO',
      detalhes: { ip: req.ip, role: user.role, plano: user.plano || 'free' },
      ip: req.ip
    });

    res.json({
      success: true,
      require2FA: true,
      email: cleanEmail,
      demoOtp: (!process.env.SMTP_USER || !process.env.SMTP_PASS) ? codigo2FA : undefined,
      message: 'Código de verificação em 2 etapas enviado para o seu e-mail!'
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no login: ' + (err.sqlMessage || err.message) });
  }
});

// 4. Confirmação do Código de Duas Etapas (2FA)
app.post('/verify-2fa', async (req, res) => {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ error: 'E-mail e código de autenticação são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCodigo = String(codigo).trim();

  try {
    const [rows] = await pool.query(
      `SELECT * FROM codigos_autenticacao 
       WHERE email = ? AND tipo = 'LOGIN_2FA' AND usado = 0 
       ORDER BY id DESC LIMIT 1`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Nenhuma sessão 2FA pendente para este e-mail. Faça login novamente.' });
    }

    const regCodigo = rows[0];
    if (new Date() > new Date(regCodigo.expira_em)) {
      return res.status(400).json({ error: 'O código de 2 etapas expirou. Solicite um novo código.' });
    }

    if (regCodigo.codigo !== cleanCodigo) {
      await pool.query('UPDATE codigos_autenticacao SET tentativas = tentativas + 1 WHERE id = ?', [regCodigo.id]);
      return res.status(400).json({ error: 'Código de 2 etapas incorreto.' });
    }

    await pool.query('UPDATE codigos_autenticacao SET usado = 1 WHERE id = ?', [regCodigo.id]);

    const [userRows] = await pool.query(
      'SELECT id, nome, email, role, bio, foto_chave, plano, assinatura_status, premium, stripe_customer_id, stripe_subscription_id, premium_since FROM usuarios WHERE id = ?',
      [regCodigo.usuario_id]
    );
    const user = userRows[0];
    const roleNorm = normalizarRole(user.role);
    const isPro = Boolean(user.premium) || user.plano === 'pro';

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: user.email,
      acao: 'LOGIN_SUCESSO',
      detalhes: { role: roleNorm, plano: isPro ? 'pro' : 'free', autenticado_2fa: true },
      ip: req.ip
    });

    res.json({
      success: true,
      userId: user.id,
      nome: user.nome,
      email: user.email,
      role: roleNorm,
      plano: isPro ? 'pro' : 'free',
      assinatura_status: user.assinatura_status || 'active',
      premium: isPro,
      stripe_customer_id: user.stripe_customer_id || null,
      stripe_subscription_id: user.stripe_subscription_id || null,
      bio: user.bio || '',
      foto_url: user.foto_chave ? `/api/profile/avatar/${user.foto_chave}` : null
    });
  } catch (err) {
    console.error('Erro na validação do 2FA:', err);
    res.status(500).json({ error: 'Erro ao validar código em duas etapas: ' + err.message });
  }
});

// 5. Reenvio de Códigos
app.post('/resend-code', async (req, res) => {
  const { email, tipo } = req.body;
  if (!email || !['EMAIL_VERIFICACAO', 'LOGIN_2FA'].includes(tipo)) {
    return res.status(400).json({ error: 'E-mail e tipo de código válidos são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const [userRows] = await pool.query('SELECT id, nome FROM usuarios WHERE email = ?', [cleanEmail]);
    if (userRows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const user = userRows[0];
    const novoCodigo = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM codigos_autenticacao WHERE email = ? AND tipo = ?', [cleanEmail, tipo]);
    await pool.query(
      'INSERT INTO codigos_autenticacao (usuario_id, email, tipo, codigo, expira_em) VALUES (?, ?, ?, ?, ?)',
      [user.id, cleanEmail, tipo, novoCodigo, expiraEm]
    );

    await enviarEmailCodigo({ to: cleanEmail, nome: user.nome, codigo: novoCodigo, tipo });

    res.json({ success: true, message: 'Novo código de segurança enviado para seu e-mail!' });
  } catch (err) {
    console.error('Erro ao reenviar código:', err);
    res.status(500).json({ error: 'Erro ao reenviar código.' });
  }
});

// 6. Solicitação de Recuperação de Senha (Expira em 30 min)
app.post('/forgot-password', async (req, res) => {
  const { email, appUrl } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail não informado.' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const [rows] = await pool.query('SELECT id, nome FROM usuarios WHERE email = ?', [cleanEmail]);
    if (rows.length === 0) return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 30 * 60 * 1000);

    await pool.query(
      'INSERT INTO reset_tokens (token, usuario_id, criado_em, expira_em, usado) VALUES (?, ?, ?, ?, 0)',
      [token, user.id, agora, expiraEm]
    );

    const baseUrl = appUrl || process.env.APP_URL || 'http://localhost:8200';
    const resetLink = `${baseUrl}/reset-password.html?token=${token}`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('AVISO: SMTP_USER e SMTP_PASS não configurados. Link gerado:', resetLink);
      return res.status(500).json({
        error: 'Serviço de e-mail não configurado. Configure SMTP_USER e SMTP_PASS nas variáveis de ambiente.'
      });
    }

    const transporter = getTransporter();
    await transporter.sendMail({
      from: getSenderAddress(),
      to: cleanEmail,
      subject: '🔑 Recuperação de Senha - BarberCloud SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; text-align: center;">💈 BarberCloud SaaS</h2>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <h3 style="color: #1e293b;">Recuperação de Senha</h3>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Olá, <strong>${user.nome}</strong>! Você solicitou a redefinição de senha para sua conta no BarberCloud.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="background-color: #d97706; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 15px; font-weight: bold; border-radius: 8px; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Este link é válido por 30 minutos: <a href="${resetLink}">${resetLink}</a>
          </p>
        </div>
      `
    });

    registrarLogAuditoria({
      usuario_id: user.id,
      usuario_nome: user.nome,
      usuario_email: cleanEmail,
      acao: 'SOLICITACAO_RECUPERACAO_SENHA',
      detalhes: { ip: req.ip },
      ip: req.ip
    });

    res.json({ success: true, message: 'E-mail de recuperação enviado com sucesso!' });
  } catch (err) {
    console.error('Erro ao gerar recuperação de senha:', err);
    res.status(500).json({ error: 'Erro ao enviar e-mail de recuperação: ' + (err.message || err) });
  }
});

// 7. Troca de Senha com Validação de Token
app.post('/reset-password', async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });

  if (novaSenha.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM reset_tokens WHERE token = ? AND usado = 0', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'Token de recuperação inválido ou já utilizado.' });

    const resetRecord = rows[0];
    if (new Date() > new Date(resetRecord.expira_em)) {
      return res.status(400).json({ error: 'Token expirado. Solicite um novo link de recuperação.' });
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [hash, resetRecord.usuario_id]);
    await pool.query('UPDATE reset_tokens SET usado = 1 WHERE id = ?', [resetRecord.id]);

    registrarLogAuditoria({
      usuario_id: resetRecord.usuario_id,
      acao: 'REDEFINICAO_SENHA_SUCESSO',
      detalhes: { ip: req.ip },
      ip: req.ip
    });

    res.json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ error: 'Erro ao redefinir a senha: ' + (err.message || err) });
  }
});

// 8. Consulta de Dados e Perfil do Usuário (inclui plano e assinatura Stripe)
app.get('/verify-user/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, email, role, bio, foto_chave, email_verificado, plano, assinatura_status, premium, stripe_customer_id, stripe_subscription_id, premium_since FROM usuarios WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const u = rows[0];
    const isPro = Boolean(u.premium) || u.plano === 'pro';
    res.json({
      ...u,
      role: normalizarRole(u.role),
      plano: isPro ? 'pro' : 'free',
      premium: isPro,
      assinatura_status: u.assinatura_status || 'active'
    });
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
  }
});

// 9. Atualizar perfil do usuário (Bio e Nome)
app.put('/profile/:id', async (req, res) => {
  const { nome, bio } = req.body;
  const userId = req.params.id;

  try {
    await pool.query(
      'UPDATE usuarios SET nome = COALESCE(?, nome), bio = COALESCE(?, bio) WHERE id = ?',
      [nome ? nome.trim() : null, bio !== undefined ? bio.trim() : null, userId]
    );

    const [rows] = await pool.query(
      'SELECT id, nome, email, role, bio, foto_chave, plano, assinatura_status, premium FROM usuarios WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar dados do perfil.' });
  }
});

// 10. Listar todos os usuários (Para Painel Admin e listagem de profissionais)
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, email, role, email_verificado, foto_chave, plano, assinatura_status, premium, stripe_customer_id, stripe_subscription_id, premium_since FROM usuarios ORDER BY id ASC'
    );
    const formatados = rows.map(u => {
      const isPro = Boolean(u.premium) || u.plano === 'pro';
      return {
        ...u,
        role: normalizarRole(u.role),
        plano: isPro ? 'pro' : 'free',
        premium: isPro,
        assinatura_status: u.assinatura_status || 'active'
      };
    });
    res.json(formatados);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// 11. Atualizar papel de usuário (RBAC com 3 papéis: cliente, profissional, admin)
app.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  const cleanRole = normalizarRole(role);
  if (!role || !PAPEIS_VALIDOS.includes(cleanRole)) {
    return res.status(400).json({ error: 'Papel inválido. Deve ser "cliente", "profissional" ou "admin".' });
  }
  try {
    const [result] = await pool.query('UPDATE usuarios SET role = ? WHERE id = ?', [cleanRole, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    registrarLogAuditoria({
      usuario_id: req.params.id,
      acao: 'ALTERACAO_PAPEL_RBAC',
      detalhes: { novo_papel: cleanRole },
      ip: req.ip
    });

    res.json({ success: true, role: cleanRole, message: `Papel do usuário atualizado para "${cleanRole}".` });
  } catch (err) {
    console.error('Erro ao atualizar papel:', err);
    res.status(500).json({ error: 'Erro ao atualizar papel do usuário.' });
  }
});

// 12. Atualizar estado de assinatura Stripe (chamado internamente pelo webhook do Stripe ou Billing Portal)
app.patch('/users/:id/subscription', async (req, res) => {
  const { plano, assinatura_status, stripe_customer_id, stripe_subscription_id } = req.body;
  const userId = req.params.id;
  const isPro = plano === 'pro' && assinatura_status !== 'canceled';

  try {
    await pool.query(
      `UPDATE usuarios 
       SET plano = ?, 
           assinatura_status = ?, 
           premium = ?, 
           stripe_customer_id = COALESCE(?, stripe_customer_id),
           stripe_subscription_id = COALESCE(?, stripe_subscription_id),
           premium_since = CASE WHEN ? = 1 AND premium_since IS NULL THEN NOW() WHEN ? = 0 THEN NULL ELSE premium_since END
       WHERE id = ?`,
      [
        isPro ? 'pro' : 'free',
        assinatura_status || 'active',
        isPro ? 1 : 0,
        stripe_customer_id || null,
        stripe_subscription_id || null,
        isPro ? 1 : 0,
        isPro ? 1 : 0,
        userId
      ]
    );

    const [rows] = await pool.query(
      'SELECT id, nome, email, role, plano, assinatura_status, premium, stripe_customer_id, stripe_subscription_id, premium_since FROM usuarios WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar assinatura do usuário:', err);
    res.status(500).json({ error: 'Erro ao atualizar assinatura: ' + err.message });
  }
});

async function enviarEmailCodigo({ to, nome, codigo, tipo }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[SMTP Não Configurado] Código para ${to} (${tipo}): ${codigo}`);
    return;
  }

  const is2FA = (tipo === 'LOGIN_2FA');
  const assunto = is2FA
    ? `🔐 BarberCloud — Seu Código 2FA: ${codigo}`
    : `📩 Ative sua conta no BarberCloud: ${codigo}`;

  const tituloCard = is2FA ? 'Verificação em Duas Etapas (2FA)' : 'Ativação de Conta BarberCloud';
  const descricao = is2FA
    ? 'Você está realizando login no <strong>BarberCloud SaaS</strong>. Utilize o código de segurança abaixo:'
    : 'Bem-vindo ao <strong>BarberCloud SaaS</strong>! Para ativar sua conta, utilize o código abaixo:';

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: getSenderAddress(),
      to,
      subject: assunto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0;">💈 BarberCloud SaaS</h2>
            <span style="display: inline-block; background-color: #fef3c7; color: #d97706; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-top: 8px;">
              ${tituloCard}
            </span>
          </div>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">${descricao}</p>
          <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; background-color: #0f172a; color: #fbbf24; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 14px 28px; border-radius: 10px;">
              ${codigo}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Este código expira em 10 minutos.</p>
          </div>
        </div>
      `
    });
  } catch (err) {
    console.error(`Erro ao enviar e-mail ${tipo} para ${to}:`, err);
  }
}

async function enviarEmailBoasVindas(email, nome) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: getSenderAddress(),
      to: email,
      subject: '🎉 Sua conta no BarberCloud SaaS está ativa!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; text-align: center;">💈 Bem-vindo(a) ao BarberCloud, ${nome}!</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Sua conta está ativa! Agora você pode agendar horários, anexar comprovantes no MinIO e gerenciar sua assinatura Pro.
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail de boas-vindas:', err);
  }
}

app.get('/health', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'DOWN';
  let dbError = null;

  try {
    const [rows] = await pool.query('SELECT 1 AS alive');
    if (rows && rows.length > 0) dbStatus = 'UP';
  } catch (err) {
    dbError = err.message;
  }

  const isHealthy = (dbStatus === 'UP');
  const responseTimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(process.uptime());

  const payload = {
    status: isHealthy ? 'UP' : 'DOWN',
    service: 'auth-service',
    domain: 'barbercloud-saas',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    responseTimeMs,
    checks: {
      database: {
        status: dbStatus,
        host: process.env.DB_HOST || '35.226.64.52',
        ...(dbError && { error: dbError })
      }
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
  <title>Swagger UI — BarberCloud Auth Service API</title>
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
app.listen(PORT, () => console.log(`BarberCloud Auth Service rodando na porta interna ${PORT}`));
