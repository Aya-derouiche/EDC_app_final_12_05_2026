CREATE SCHEMA IF NOT EXISTS cloud;
SET search_path TO cloud, public;

CREATE TABLE IF NOT EXISTS entreprises (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  nom VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS utilisateurs (
  id BIGSERIAL PRIMARY KEY,
  entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('admin','comptable','client')),
  gym_branch_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  uploaded_by BIGINT NOT NULL REFERENCES utilisateurs(id),
  document_type VARCHAR(50) NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_bucket VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('uploaded','processed','validated','accounted','extraction_failed')),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_extractions (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  extracted_data JSONB NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  raw_text TEXT,
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by BIGINT REFERENCES utilisateurs(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ecritures_comptables (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL,
  label TEXT NOT NULL,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL,
  created_by BIGINT NOT NULL REFERENCES utilisateurs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chatbot conversations/messages
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(255) DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS chatbot_documents (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  conversation_id BIGINT NULL REFERENCES conversations(id) ON DELETE SET NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120),
  file_size BIGINT,
  storage_bucket VARCHAR(120) NOT NULL,
  storage_key TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_documents_tenant ON chatbot_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_conversation ON chatbot_documents(conversation_id);

-- Module Registry (tenant -> enabled modules)
CREATE TABLE IF NOT EXISTS tenant_modules (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  module_key VARCHAR(80) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (code_entreprise, module_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_code ON tenant_modules(code_entreprise);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_key ON tenant_modules(module_key);
