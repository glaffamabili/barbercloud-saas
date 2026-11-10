-- =============================================================================
-- BarberCloud SaaS — Migração e Seed Inicial do Domínio (Atividades 10 e 11)
-- Disciplina: ISW055 · Introdução à Computação em Nuvem
-- Aluna: Amabili Flor | Professor: Prof. Allan Lincoln Rodrigues Siriani (@siriani)
-- =============================================================================

-- 1. Evolução da Tabela de Usuários (3 papéis de negócio + ciclo de vida SaaS Stripe)
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cliente', -- 'cliente' | 'profissional' | 'admin'
  bio TEXT DEFAULT NULL,
  foto_chave VARCHAR(255) DEFAULT NULL,
  plano VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  assinatura_status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled'
  premium BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id VARCHAR(100) DEFAULT NULL,
  stripe_subscription_id VARCHAR(100) DEFAULT NULL,
  premium_since TIMESTAMP NULL DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Domínio #1: Catálogo de Serviços da Barbearia (servicos_barbearia)
-- Possui chave estrangeira (FK) apontando para o profissional responsável em usuarios(id)
CREATE TABLE IF NOT EXISTS servicos_barbearia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profissional_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  categoria VARCHAR(60) NOT NULL DEFAULT 'Corte & Barba',
  descricao TEXT NOT NULL,
  preco DECIMAL(10, 2) NOT NULL DEFAULT 45.00,
  duracao_min INT NOT NULL DEFAULT 40,
  foto_chave VARCHAR(255) DEFAULT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_servico_profissional
    FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

-- 3. Tabela de Domínio #2: Agendamentos de Clientes (agendamentos)
-- Possui chaves estrangeiras (FKs) para cliente, profissional e serviço
CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  profissional_id INT NOT NULL,
  servico_id INT NOT NULL,
  data_hora DATETIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'agendado', -- 'agendado' | 'confirmado' | 'concluido' | 'cancelado'
  observacoes TEXT DEFAULT NULL,
  comprovante_chave VARCHAR(255) DEFAULT NULL, -- Chave S3 do comprovante/referência no MinIO
  valor_cobrado DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agendamento_cliente
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_agendamento_profissional
    FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_agendamento_servico
    FOREIGN KEY (servico_id) REFERENCES servicos_barbearia(id)
    ON DELETE CASCADE
);

-- 4. Tabela de Domínio #3: Avaliações Pós-Atendimento (avaliacoes_atendimento)
-- Possui chaves estrangeiras (FKs) para o agendamento e para o cliente avaliador
CREATE TABLE IF NOT EXISTS avaliacoes_atendimento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agendamento_id INT NOT NULL,
  cliente_id INT NOT NULL,
  nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_avaliacao_agendamento
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_avaliacao_cliente
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

-- 5. Tabela de Governança SaaS: Controle de Idempotência de Webhooks Stripe (Atividade 11)
CREATE TABLE IF NOT EXISTS eventos_stripe_processados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(80) NOT NULL,
  usuario_id INT DEFAULT NULL,
  payload_resumo TEXT DEFAULT NULL,
  processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SEED INICIAL DO DOMÍNIO BARBERCLOUD (Dados demonstrativos iniciais)
-- =============================================================================

INSERT IGNORE INTO usuarios (id, nome, email, senha, role, bio, plano, assinatura_status, premium, stripe_customer_id, stripe_subscription_id, premium_since)
VALUES
  (1, 'Amabili Flor (Admin SaaS)', 'admin@barbercloud.lapps.studio', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R5wFc26J8rK1F8pS1lG8E.qO0K2', 'admin', 'Gestora da plataforma BarberCloud SaaS.', 'pro', 'active', TRUE, 'cus_test_admin_01', 'sub_test_admin_01', NOW()),
  (2, 'Lucas Almeida (Mestre Barbeiro)', 'lucas.barbeiro@barbercloud.lapps.studio', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R5wFc26J8rK1F8pS1lG8E.qO0K2', 'profissional', 'Especialista em Degradê Navalhado, Barboterapia com Toalha Quente e Visagismo.', 'pro', 'active', TRUE, 'cus_test_lucas_02', 'sub_test_lucas_02', NOW()),
  (3, 'Rafael Costa (Cliente Free)', 'rafael.cliente@barbercloud.lapps.studio', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R5wFc26J8rK1F8pS1lG8E.qO0K2', 'cliente', 'Cliente recorrente aos sábados.', 'free', 'active', FALSE, NULL, NULL, NULL),
  (4, 'Gabriel Mendes (Cliente Pro VIP)', 'gabriel.vip@barbercloud.lapps.studio', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R5wFc26J8rK1F8pS1lG8E.qO0K2', 'cliente', 'Assinante do Clube BarberCloud Pro Ilimitado.', 'pro', 'active', TRUE, 'cus_test_gabriel_04', 'sub_test_gabriel_04', NOW());

INSERT IGNORE INTO servicos_barbearia (id, profissional_id, nome, categoria, descricao, preco, duracao_min, foto_chave, ativo)
VALUES
  (1, 2, 'Corte Degradê Navalhado (Fade)', 'Cabelo', 'Corte moderno com acabamento na navalha, lavagem revigorante e finalização com pomada matte.', 50.00, 45, NULL, TRUE),
  (2, 2, 'Barboterapia Real com Toalha Quente', 'Barba', 'Alinhamento completo da barba com ritual de toalha quente, óleo essencial de cedro e pós-barba.', 40.00, 30, NULL, TRUE),
  (3, 2, 'Combo VIP (Corte + Barboterapia + Sobrancelha)', 'Combo Premium', 'Experiência completa de visagismo masculino: cabelo, barba com vapor de ozônio e design de sobrancelha.', 80.00, 75, NULL, TRUE),
  (4, 2, 'Hidratação Capilar & Selagem Térmica', 'Estética & Tratamento', 'Nutrição profunda dos fios com redução de volume e brilho intenso.', 65.00, 50, NULL, TRUE),
  (5, 2, 'Corte Infantil Estilizado', 'Kids', 'Atendimento dedicado e paciente para crianças de até 12 anos.', 45.00, 40, NULL, TRUE);

INSERT IGNORE INTO agendamentos (id, cliente_id, profissional_id, servico_id, data_hora, status, observacoes, comprovante_chave, valor_cobrado)
VALUES
  (1, 3, 2, 1, '2026-11-12 14:00:00', 'confirmado', 'Degradê médio (mid fade), preservar topo com tesoura.', NULL, 50.00),
  (2, 3, 2, 2, '2026-11-14 16:30:00', 'agendado', 'Alinhar linha da bochecha alta.', NULL, 40.00),
  (3, 4, 2, 3, '2026-11-15 10:00:00', 'concluido', 'Atendimento VIP de sábado concluído no horário.', NULL, 80.00);

INSERT IGNORE INTO avaliacoes_atendimento (id, agendamento_id, cliente_id, nota, comentario)
VALUES
  (1, 3, 4, 5, 'Atendimento impecável do mestre Lucas! Agendei pelo BarberCloud em 30 segundos e não peguei fila.');
