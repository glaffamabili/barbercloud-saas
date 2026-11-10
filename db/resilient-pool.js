const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, 'local_fallback_store.json');

function getInitialStore() {
  // Hash bcrypt válido para a senha padrão '123456'
  const hashPadrao = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  return {
    usuarios: [
      {
        id: 1,
        nome: 'Amabili Flor (Admin SaaS)',
        email: 'admin@barbercloud.lapps.studio',
        senha_hash: hashPadrao,
        role: 'admin',
        bio: 'Gestora da plataforma BarberCloud SaaS.',
        foto_chave: null,
        email_verificado: 1,
        plano: 'pro',
        assinatura_status: 'active',
        premium: 1,
        stripe_customer_id: 'cus_test_admin_01',
        stripe_subscription_id: 'sub_test_admin_01',
        premium_since: '2026-10-09 15:18:00'
      },
      {
        id: 2,
        nome: 'Lucas Almeida (Mestre Barbeiro)',
        email: 'lucas@barbercloud.lapps.studio',
        senha_hash: hashPadrao,
        role: 'profissional',
        bio: 'Especialista em Degradê Navalhado, Barboterapia com Toalha Quente e Visagismo.',
        foto_chave: null,
        email_verificado: 1,
        plano: 'pro',
        assinatura_status: 'active',
        premium: 1,
        stripe_customer_id: 'cus_test_lucas_02',
        stripe_subscription_id: 'sub_test_lucas_02',
        premium_since: '2026-10-15 10:00:00'
      },
      {
        id: 3,
        nome: 'Rafael Costa (Cliente Free)',
        email: 'rafael@gmail.com',
        senha_hash: hashPadrao,
        role: 'cliente',
        bio: 'Cliente recorrente aos sábados.',
        foto_chave: null,
        email_verificado: 1,
        plano: 'free',
        assinatura_status: 'active',
        premium: 0,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        premium_since: null
      },
      {
        id: 4,
        nome: 'Gabriel Mendes (Cliente Pro VIP)',
        email: 'gabriel@gmail.com',
        senha_hash: hashPadrao,
        role: 'cliente',
        bio: 'Assinante do Clube BarberCloud Pro Ilimitado.',
        foto_chave: null,
        email_verificado: 1,
        plano: 'pro',
        assinatura_status: 'active',
        premium: 1,
        stripe_customer_id: 'cus_test_gabriel_04',
        stripe_subscription_id: 'sub_test_gabriel_04',
        premium_since: '2026-11-01 11:20:00'
      }
    ],
    servicos_barbearia: [
      { id: 1, profissional_id: 2, nome: 'Corte Degradê Navalhado (Fade)', categoria: 'Cabelo', descricao: 'Corte moderno com acabamento na navalha, lavagem revigorante e finalização com pomada matte.', preco: 50.00, duracao_min: 45, foto_chave: null, ativo: 1 },
      { id: 2, profissional_id: 2, nome: 'Barboterapia Real com Toalha Quente', categoria: 'Barba', descricao: 'Alinhamento completo da barba com ritual de toalha quente, óleo essencial de cedro e pós-barba.', preco: 40.00, duracao_min: 30, foto_chave: null, ativo: 1 },
      { id: 3, profissional_id: 2, nome: 'Combo VIP (Corte + Barboterapia + Sobrancelha)', categoria: 'Combo Premium', descricao: 'Experiência completa de visagismo masculino: cabelo, barba com vapor de ozônio e design de sobrancelha.', preco: 80.00, duracao_min: 75, foto_chave: null, ativo: 1 },
      { id: 4, profissional_id: 2, nome: 'Hidratação Capilar & Selagem Térmica', categoria: 'Estética & Tratamento', descricao: 'Nutrição profunda dos fios com redução de volume e brilho intenso.', preco: 65.00, duracao_min: 50, foto_chave: null, ativo: 1 },
      { id: 5, profissional_id: 2, nome: 'Corte Infantil Estilizado', categoria: 'Kids', descricao: 'Atendimento dedicado e paciente para crianças de até 12 anos.', preco: 45.00, duracao_min: 40, foto_chave: null, ativo: 1 }
    ],
    agendamentos: [
      { id: 1, cliente_id: 3, profissional_id: 2, servico_id: 1, data_hora: '2026-11-12T14:00:00', status: 'confirmado', observacoes: 'Degradê médio (mid fade), preservar topo com tesoura.', comprovante_chave: null, valor_cobrado: 50.00, criado_em: '2026-11-10T10:00:00Z' },
      { id: 2, cliente_id: 3, profissional_id: 2, servico_id: 2, data_hora: '2026-11-14T16:30:00', status: 'agendado', observacoes: 'Alinhar linha da bochecha alta.', comprovante_chave: null, valor_cobrado: 40.00, criado_em: '2026-11-10T10:15:00Z' },
      { id: 3, cliente_id: 4, profissional_id: 2, servico_id: 3, data_hora: '2026-11-15T10:00:00', status: 'concluido', observacoes: 'Atendimento VIP de sábado concluído no horário.', comprovante_chave: null, valor_cobrado: 80.00, criado_em: '2026-11-10T11:00:00Z' }
    ],
    avaliacoes_atendimento: [
      { id: 1, agendamento_id: 3, cliente_id: 4, nota: 5, comentario: 'Atendimento impecável do mestre Lucas! Agendei pelo BarberCloud em 30 segundos e não peguei fila.', criado_em: '2026-11-10T11:30:00Z' }
    ],
    eventos_stripe_processados: [
      { id: 1, event_id: 'evt_test_seed_01', event_type: 'checkout.session.completed', usuario_id: 4, payload_resumo: '{"novoPlano":"pro","novoStatus":"active"}', processado_em: '2026-11-01T11:20:00Z' }
    ],
    codigos_autenticacao: [],
    reset_tokens: []
  };
}

function readStore() {
  try {
    if (fs.existsSync(dbFile)) {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
  } catch (e) {}
  const initial = getInitialStore();
  saveStore(initial);
  return initial;
}

function saveStore(data) {
  try {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function executeFallbackQuery(sql, params = []) {
  const s = sql.trim().replace(/\s+/g, ' ');
  const store = readStore();

  if (/^CREATE TABLE|^ALTER TABLE|^SHOW COLUMNS|^UPDATE usuarios SET role = 'cliente' WHERE/i.test(s)) {
    return [[], {}];
  }
  if (/^SELECT 1 AS alive/i.test(s)) {
    return [[{ alive: 1 }], {}];
  }

  // USUARIOS
  if (/FROM usuarios WHERE email = \?/i.test(s)) {
    const email = String(params[0] || '').toLowerCase();
    return [store.usuarios.filter(u => u.email.toLowerCase() === email), {}];
  }
  if (/FROM usuarios WHERE id = \?/i.test(s)) {
    const id = Number(params[0]);
    return [store.usuarios.filter(u => u.id === id), {}];
  }
  if (/FROM usuarios WHERE stripe_customer_id = \?/i.test(s)) {
    return [store.usuarios.filter(u => u.stripe_customer_id === params[0]), {}];
  }
  if (/FROM usuarios ORDER BY id ASC/i.test(s)) {
    return [store.usuarios, {}];
  }
  if (/INSERT INTO usuarios/i.test(s)) {
    const newId = store.usuarios.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    store.usuarios.push({
      id: newId,
      nome: params[0],
      email: params[1],
      senha_hash: params[2],
      role: params[3] || 'cliente',
      plano: params[4] || 'free',
      assinatura_status: params[5] || 'active',
      premium: 0,
      email_verificado: 1,
      bio: '',
      foto_chave: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      premium_since: null
    });
    saveStore(store);
    return [{ insertId: newId, affectedRows: 1 }, {}];
  }
  if (/UPDATE usuarios SET email_verificado = 1 WHERE id = \?/i.test(s)) {
    const u = store.usuarios.find(x => x.id === Number(params[0]));
    if (u) u.email_verificado = 1;
    saveStore(store);
    return [{ affectedRows: u ? 1 : 0 }, {}];
  }
  if (/UPDATE usuarios SET nome = COALESCE/i.test(s)) {
    const u = store.usuarios.find(x => x.id === Number(params[2]));
    if (u) {
      if (params[0]) u.nome = params[0];
      if (params[1] !== null && params[1] !== undefined) u.bio = params[1];
    }
    saveStore(store);
    return [{ affectedRows: u ? 1 : 0 }, {}];
  }
  if (/UPDATE usuarios SET foto_chave = \? WHERE id = \?/i.test(s)) {
    const u = store.usuarios.find(x => x.id === Number(params[1]));
    if (u) u.foto_chave = params[0];
    saveStore(store);
    return [{ affectedRows: u ? 1 : 0 }, {}];
  }
  if (/UPDATE usuarios SET role = \? WHERE id = \?/i.test(s)) {
    const u = store.usuarios.find(x => x.id === Number(params[1]));
    if (u) u.role = params[0];
    saveStore(store);
    return [{ affectedRows: u ? 1 : 0 }, {}];
  }
  if (/UPDATE usuarios SET plano = \?/i.test(s)) {
    const u = store.usuarios.find(x => x.id === Number(params[7]));
    if (u) {
      u.plano = params[0];
      u.assinatura_status = params[1];
      u.premium = params[2];
      if (params[3]) u.stripe_customer_id = params[3];
      if (params[4]) u.stripe_subscription_id = params[4];
      u.premium_since = params[2] ? (u.premium_since || new Date().toISOString()) : null;
    }
    saveStore(store);
    return [{ affectedRows: u ? 1 : 0 }, {}];
  }

  // CODIGOS 2FA / VERIFICACAO
  if (/DELETE FROM codigos_autenticacao/i.test(s)) {
    store.codigos_autenticacao = store.codigos_autenticacao.filter(c => !(c.email === params[0] && c.tipo === params[1]));
    saveStore(store);
    return [{ affectedRows: 1 }, {}];
  }
  if (/INSERT INTO codigos_autenticacao/i.test(s)) {
    const newId = store.codigos_autenticacao.length + 1;
    store.codigos_autenticacao.push({
      id: newId,
      usuario_id: params[0],
      email: params[1],
      tipo: params[2],
      codigo: params[3],
      expira_em: params[4],
      usado: 0,
      tentativas: 0
    });
    saveStore(store);
    return [{ insertId: newId }, {}];
  }
  if (/FROM codigos_autenticacao WHERE email = \?/i.test(s)) {
    const tipo = s.includes('LOGIN_2FA') ? 'LOGIN_2FA' : 'EMAIL_VERIFICACAO';
    const rows = store.codigos_autenticacao.filter(c => c.email === params[0] && c.tipo === tipo && !c.usado).reverse();
    return [rows, {}];
  }
  if (/UPDATE codigos_autenticacao SET usado = 1/i.test(s)) {
    const c = store.codigos_autenticacao.find(x => x.id === Number(params[0]));
    if (c) c.usado = 1;
    saveStore(store);
    return [{ affectedRows: 1 }, {}];
  }

  // SERVICOS BARBEARIA
  if (/SELECT COUNT\(\*\) AS total FROM servicos_barbearia/i.test(s)) {
    return [[{ total: store.servicos_barbearia.filter(x => x.ativo).length }], {}];
  }
  if (/FROM servicos_barbearia s LEFT JOIN usuarios u/i.test(s)) {
    if (s.includes('WHERE s.id = ?')) {
      const sv = store.servicos_barbearia.find(x => x.id === Number(params[0]));
      if (!sv) return [[], {}];
      const prof = store.usuarios.find(u => u.id === sv.profissional_id);
      return [[{ ...sv, profissional_nome: prof ? prof.nome : 'Profissional' }], {}];
    }
    const ativos = store.servicos_barbearia.filter(x => x.ativo).map(sv => {
      const prof = store.usuarios.find(u => u.id === sv.profissional_id);
      return { ...sv, profissional_nome: prof ? prof.nome : 'Profissional' };
    });
    return [ativos, {}];
  }
  if (/SELECT \* FROM servicos_barbearia WHERE id = \?/i.test(s)) {
    const sv = store.servicos_barbearia.find(x => x.id === Number(params[0]) && (!s.includes('ativo = 1') || x.ativo));
    return [sv ? [sv] : [], {}];
  }
  if (/INSERT INTO servicos_barbearia/i.test(s)) {
    const newId = store.servicos_barbearia.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    store.servicos_barbearia.push({
      id: newId,
      profissional_id: Number(params[0]),
      nome: params[1],
      categoria: params[2],
      descricao: params[3],
      preco: Number(params[4]),
      duracao_min: Number(params[5]),
      foto_chave: params[6] || null,
      ativo: 1
    });
    saveStore(store);
    return [{ insertId: newId, affectedRows: 1 }, {}];
  }
  if (/UPDATE servicos_barbearia SET foto_chave = \? WHERE id = \?/i.test(s)) {
    const sv = store.servicos_barbearia.find(x => x.id === Number(params[1]));
    if (sv) sv.foto_chave = params[0];
    saveStore(store);
    return [{ affectedRows: 1 }, {}];
  }
  if (/UPDATE servicos_barbearia SET ativo = 0 WHERE id = \?/i.test(s)) {
    const sv = store.servicos_barbearia.find(x => x.id === Number(params[0]));
    if (sv) sv.ativo = 0;
    saveStore(store);
    return [{ affectedRows: 1 }, {}];
  }
  if (/UPDATE servicos_barbearia SET nome = COALESCE/i.test(s)) {
    const sv = store.servicos_barbearia.find(x => x.id === Number(params[6]));
    if (sv) {
      if (params[0]) sv.nome = params[0];
      if (params[1]) sv.categoria = params[1];
      if (params[2]) sv.descricao = params[2];
      if (params[3] !== null) sv.preco = params[3];
      if (params[4] !== null) sv.duracao_min = params[4];
      if (params[5] !== null) sv.ativo = params[5];
    }
    saveStore(store);
    return [{ affectedRows: sv ? 1 : 0 }, {}];
  }

  // AGENDAMENTOS
  if (/SELECT COUNT\(\*\) AS total FROM agendamentos WHERE cliente_id = \? AND status IN/i.test(s)) {
    const cid = Number(params[0]);
    const total = store.agendamentos.filter(a => a.cliente_id === cid && ['agendado', 'confirmado'].includes(a.status)).length;
    return [[{ total }], {}];
  }
  if (/SELECT COUNT\(\*\) AS total FROM agendamentos WHERE cliente_id = \?/i.test(s)) {
    const cid = Number(params[0]);
    return [[{ total: store.agendamentos.filter(a => a.cliente_id === cid).length }], {}];
  }
  if (/SELECT COUNT\(\*\) AS total FROM agendamentos$/i.test(s)) {
    return [[{ total: store.agendamentos.length }], {}];
  }
  if (/FROM agendamentos a LEFT JOIN servicos_barbearia s/i.test(s)) {
    let list = store.agendamentos.map(a => {
      const sv = store.servicos_barbearia.find(x => x.id === a.servico_id) || {};
      const cli = store.usuarios.find(u => u.id === a.cliente_id) || {};
      const prof = store.usuarios.find(u => u.id === a.profissional_id) || {};
      return {
        ...a,
        servico_nome: sv.nome,
        servico_categoria: sv.categoria,
        duracao_min: sv.duracao_min,
        servico_foto_chave: sv.foto_chave,
        cliente_nome: cli.nome,
        cliente_email: cli.email,
        cliente_plano: cli.plano,
        profissional_nome: prof.nome
      };
    });
    if (s.includes('WHERE a.id = ?')) {
      list = list.filter(a => a.id === Number(params[0]));
    } else if (s.includes('WHERE a.cliente_id = ?') && !s.includes('OR a.cliente_id')) {
      list = list.filter(a => a.cliente_id === Number(params[0]));
    } else if (s.includes('WHERE a.profissional_id = ? OR a.cliente_id = ?')) {
      list = list.filter(a => a.profissional_id === Number(params[0]) || a.cliente_id === Number(params[1]));
    }
    return [list.reverse(), {}];
  }
  if (/SELECT \* FROM agendamentos WHERE id = \?/i.test(s)) {
    const ag = store.agendamentos.find(a => a.id === Number(params[0]));
    return [ag ? [ag] : [], {}];
  }
  if (/INSERT INTO agendamentos/i.test(s)) {
    const newId = store.agendamentos.reduce((m, a) => Math.max(m, a.id), 0) + 1;
    store.agendamentos.push({
      id: newId,
      cliente_id: Number(params[0]),
      profissional_id: Number(params[1]),
      servico_id: Number(params[2]),
      data_hora: params[3],
      status: 'agendado',
      observacoes: params[4],
      comprovante_chave: null,
      valor_cobrado: Number(params[5]),
      criado_em: new Date().toISOString()
    });
    saveStore(store);
    return [{ insertId: newId, affectedRows: 1 }, {}];
  }
  if (/UPDATE agendamentos SET data_hora = COALESCE/i.test(s)) {
    const ag = store.agendamentos.find(a => a.id === Number(params[3]));
    if (ag) {
      if (params[0]) ag.data_hora = params[0];
      if (params[1]) ag.status = params[1];
      if (params[2] !== null && params[2] !== undefined) ag.observacoes = params[2];
    }
    saveStore(store);
    return [{ affectedRows: ag ? 1 : 0 }, {}];
  }
  if (/UPDATE agendamentos SET comprovante_chave = \? WHERE id = \?/i.test(s)) {
    const ag = store.agendamentos.find(a => a.id === Number(params[1]));
    if (ag) ag.comprovante_chave = params[0];
    saveStore(store);
    return [{ affectedRows: 1 }, {}];
  }
  if (/DELETE FROM agendamentos WHERE id = \?/i.test(s)) {
    store.agendamentos = store.agendamentos.filter(a => a.id !== Number(params[0]));
    saveStore(store);
    return [{ affectedRows: 1 }, {}];
  }

  // AVALIACOES
  if (/SELECT COUNT\(\*\) AS total FROM avaliacoes_atendimento WHERE cliente_id = \?/i.test(s)) {
    return [[{ total: store.avaliacoes_atendimento.filter(x => x.cliente_id === Number(params[0])).length }], {}];
  }
  if (/FROM avaliacoes_atendimento av/i.test(s)) {
    const rows = store.avaliacoes_atendimento.map(av => {
      const cli = store.usuarios.find(u => u.id === av.cliente_id) || {};
      const ag = store.agendamentos.find(a => a.id === av.agendamento_id) || {};
      const sv = store.servicos_barbearia.find(x => x.id === ag.servico_id) || {};
      return { ...av, cliente_nome: cli.nome, cliente_foto_chave: cli.foto_chave, cliente_plano: cli.plano, servico_nome: sv.nome };
    });
    return [rows.reverse(), {}];
  }
  if (/INSERT INTO avaliacoes_atendimento/i.test(s)) {
    const newId = store.avaliacoes_atendimento.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    store.avaliacoes_atendimento.push({
      id: newId,
      agendamento_id: Number(params[0]),
      cliente_id: Number(params[1]),
      nota: Number(params[2]),
      comentario: params[3],
      criado_em: new Date().toISOString()
    });
    saveStore(store);
    return [{ insertId: newId }, {}];
  }

  // EVENTOS STRIPE IDEMPOTENCIA
  if (/SELECT COUNT\(\*\) AS total FROM eventos_stripe_processados/i.test(s)) {
    return [[{ total: store.eventos_stripe_processados.length }], {}];
  }
  if (/FROM eventos_stripe_processados WHERE event_id = \?/i.test(s)) {
    return [store.eventos_stripe_processados.filter(e => e.event_id === params[0]), {}];
  }
  if (/INSERT INTO eventos_stripe_processados/i.test(s)) {
    const newId = store.eventos_stripe_processados.length + 1;
    store.eventos_stripe_processados.push({
      id: newId,
      event_id: params[0],
      event_type: params[1],
      usuario_id: params[2],
      payload_resumo: params[3],
      processado_em: new Date().toISOString()
    });
    saveStore(store);
    return [{ insertId: newId }, {}];
  }

  return [[], {}];
}

function wrapPoolWithFallback(rawPool) {
  return {
    async query(sql, params) {
      try {
        return await rawPool.query(sql, params);
      } catch (err) {
        if (err.code === 'ER_DISK_FULL' || err.code === 'EE_WRITE' || err.errno === 28 || err.errno === 1021 || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ER_NO_SUCH_TABLE') {
          return executeFallbackQuery(sql, params);
        }
        throw err;
      }
    }
  };
}

module.exports = { wrapPoolWithFallback, readStore };
