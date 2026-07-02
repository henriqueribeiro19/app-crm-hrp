-- ============================================================
-- FoodCRM — Schema completo para Supabase / Postgres
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão de UUID (já vem ativo no Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- EMPRESAS / LEADS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  nome_fantasia    text,
  cnpj             text,
  telefone         text,
  email            text,
  segmento         text,                        -- padaria, restaurante, etc.
  bairro           text,
  municipio        text,
  uf               text DEFAULT 'SP',
  porte            text,                        -- MEI, ME, EPP, DEMAIS
  capital_social   numeric(15,2),
  socios           text,
  score            int DEFAULT 0,
  classificacao    text,                        -- A, B, C
  produto_sugerido text,                        -- cloudfy, cplung, qualificar
  status_funil     text DEFAULT 'novo',         -- novo, contato, proposta, fechado_ganho, fechado_perdido
  canal_origem     text DEFAULT 'scraping',
  responsavel_id   uuid REFERENCES auth.users(id),
  observacoes      text,
  metadata         jsonb DEFAULT '{}'::jsonb,
  criado_em        timestamptz DEFAULT now(),
  atualizado_em    timestamptz DEFAULT now(),
  excluido_em      timestamptz                  -- soft delete
);

CREATE INDEX IF NOT EXISTS ix_empresas_status   ON empresas (status_funil) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_empresas_produto  ON empresas (produto_sugerido) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_empresas_score    ON empresas (score DESC) WHERE excluido_em IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_empresas_cnpj ON empresas (cnpj) WHERE cnpj IS NOT NULL AND excluido_em IS NULL;

-- ────────────────────────────────────────────────────────────
-- STAGING DE RASPAGEM (leads brutos antes da triagem)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staging_raspagem (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte           text DEFAULT 'upload_xlsx',
  bruto           jsonb NOT NULL,               -- linha original do arquivo
  nome            text,
  cnpj            text,
  telefone        text,
  email           text,
  segmento        text,
  municipio       text,
  bairro          text,
  score           int DEFAULT 0,
  classificacao   text,
  produto_sugerido text,
  status          text DEFAULT 'pendente',      -- pendente, aprovado, descartado
  motivo_descarte text,
  empresa_id      uuid REFERENCES empresas(id), -- preenchido após aprovação
  criado_em       timestamptz DEFAULT now(),
  processado_em   timestamptz
);

CREATE INDEX IF NOT EXISTS ix_staging_status  ON staging_raspagem (status, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_staging_gin     ON staging_raspagem USING GIN (bruto);

-- ────────────────────────────────────────────────────────────
-- INTERAÇÕES (histórico de contatos)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id  uuid REFERENCES auth.users(id),
  tipo        text NOT NULL,   -- whatsapp, ligacao, email, visita, anotacao
  notas       text,
  ocorreu_em  timestamptz DEFAULT now(),
  criado_em   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_interacoes_empresa ON interacoes (empresa_id, ocorreu_em DESC);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: atualiza atualizado_em automaticamente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empresas_atualizado_em ON empresas;
CREATE TRIGGER trg_empresas_atualizado_em
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ────────────────────────────────────────────────────────────
-- RLS — Segurança por linha
-- Apenas usuários autenticados acessam os dados
-- ────────────────────────────────────────────────────────────
ALTER TABLE empresas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_raspagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes       ENABLE ROW LEVEL SECURITY;

-- Política: qualquer usuário autenticado vê e edita tudo
-- (para escalar para multiusuário com isolamento, adicionar tenant_id depois)
CREATE POLICY "usuarios autenticados — empresas"
  ON empresas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "usuarios autenticados — staging"
  ON staging_raspagem FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "usuarios autenticados — interacoes"
  ON interacoes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- DADOS DE EXEMPLO (remova em produção)
-- ────────────────────────────────────────────────────────────
INSERT INTO empresas (nome, nome_fantasia, cnpj, telefone, segmento, municipio, bairro, score, classificacao, produto_sugerido, status_funil)
VALUES
  ('VILLA GRANO COMERCIO DE ALIMENTOS LTDA', 'Villa Grano', '12.345.678/0001-01', '(11) 3100-0868', 'Padaria', 'SAO PAULO', 'Vila Madalena', 95, 'A', 'cloudfy', 'novo'),
  ('WHEAT PADARIA ARTESANAL LTDA', 'Wheat Padaria', '12.345.678/0001-02', '(11) 3628-8209', 'Padaria', 'SAO PAULO', 'Lapa', 85, 'A', 'cloudfy', 'contato'),
  ('GIARDINO PANETTERIA LTDA', 'Giardino Panetteria', '12.345.678/0001-03', '(11) 3043-7800', 'Padaria', 'SAO PAULO', 'Vila Leopoldina', 75, 'A', 'cloudfy', 'proposta'),
  ('CANTO DOS PAES LTDA', 'Canto dos Paes', '12.345.678/0001-04', '(11) 6526-5183', 'Padaria', 'SAO PAULO', 'Vila Miriam', 80, 'A', 'cplung', 'novo'),
  ('MINI PADARIA FORTALEZA ME', 'Mini Padaria Fortaleza', '12.345.678/0001-05', '(11) 6331-3043', 'Padaria', 'OSASCO', 'Rochdale', 80, 'A', 'cplung', 'novo')
ON CONFLICT DO NOTHING;
