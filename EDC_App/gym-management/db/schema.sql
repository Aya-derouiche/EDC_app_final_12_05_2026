-- Gym Management module schema
-- Covers central HQ + branches, members, subscriptions, contracts,
-- salary-deduction mandates, payments, bank returns, classes, coaches,
-- attendance, cash desk, access events, notifications and settings.

CREATE SCHEMA IF NOT EXISTS gym;
SET search_path TO gym, public;

CREATE TABLE IF NOT EXISTS gym_branches (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  branch_code VARCHAR(80) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  city VARCHAR(120),
  hotel_spa_integrated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (code_entreprise, branch_code)
);

CREATE TABLE IF NOT EXISTS gym_members (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  member_code VARCHAR(80) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  employee_id VARCHAR(120),
  cin VARCHAR(120),
  email VARCHAR(255),
  phone VARCHAR(80),
  bank_account VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (code_entreprise, member_code)
);

CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  member_id BIGINT NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  plan_name VARCHAR(120) NOT NULL,
  amount NUMERIC(14,3) NOT NULL,
  payment_method VARCHAR(40) NOT NULL CHECK (payment_method IN ('direct','salary_deduction')),
  workflow_status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (workflow_status IN ('pending','printed','sent_hq','processed')),
  due_day INT NOT NULL DEFAULT 5,
  start_date DATE NOT NULL,
  end_date DATE,
  deduction_doc_ref TEXT,
  created_by BIGINT,
  validated_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_payments (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES gym_subscriptions(id) ON DELETE CASCADE,
  month_ref DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,3) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','insufficient_funds','retry_scheduled')),
  paid_at TIMESTAMP,
  failure_reason TEXT,
  reference VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, month_ref)
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES gym_payments(id) ON DELETE CASCADE,
  attempt_no INT NOT NULL,
  result_status VARCHAR(40) NOT NULL CHECK (result_status IN ('success','failed','insufficient_funds','retry_scheduled')),
  failure_reason TEXT,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS gym_contracts (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES gym_subscriptions(id) ON DELETE CASCADE,
  tenant_code VARCHAR(80) NOT NULL,
  contract_pdf_path TEXT,
  mandate_pdf_path TEXT,
  authorization_pdf_path TEXT,
  validation_status VARCHAR(40) NOT NULL DEFAULT 'pending_hq'
    CHECK (validation_status IN ('pending_hq','approved','rejected','needs_update')),
  hq_comment TEXT,
  validated_by BIGINT,
  validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hq_validation_queue (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  subscription_id BIGINT NOT NULL REFERENCES gym_subscriptions(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','needs_update')),
  reviewer_id BIGINT,
  reviewer_comment TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_code, subscription_id)
);

CREATE TABLE IF NOT EXISTS gym_batch_jobs (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  month_ref DATE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed')),
  created_by BIGINT,
  processed_by BIGINT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_salary_deduction_exports (
  id BIGSERIAL PRIMARY KEY,
  batch_job_id BIGINT NOT NULL REFERENCES gym_batch_jobs(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  xml_content TEXT NOT NULL,
  minio_bucket VARCHAR(120),
  minio_object_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_bank_returns (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  payment_id BIGINT REFERENCES gym_payments(id) ON DELETE SET NULL,
  batch_job_id BIGINT REFERENCES gym_batch_jobs(id) ON DELETE SET NULL,
  bank_name VARCHAR(120),
  result_status VARCHAR(40) NOT NULL CHECK (result_status IN ('success','failed','insufficient_funds','account_blocked')),
  failure_reason TEXT,
  raw_payload TEXT,
  imported_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_coaches (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  specialty VARCHAR(160),
  phone VARCHAR(80),
  email VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_classes (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  coach_id BIGINT REFERENCES gym_coaches(id) ON DELETE SET NULL,
  class_name VARCHAR(180) NOT NULL,
  class_type VARCHAR(120),
  capacity INT NOT NULL DEFAULT 20,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_attendance (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
  class_id BIGINT REFERENCES gym_classes(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  checkin_type VARCHAR(40) NOT NULL DEFAULT 'gym',
  checked_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by BIGINT
);

CREATE TABLE IF NOT EXISTS gym_cash_transactions (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
  subscription_id BIGINT REFERENCES gym_subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(14,3) NOT NULL,
  direction VARCHAR(20) NOT NULL DEFAULT 'in' CHECK (direction IN ('in','out')),
  payment_method VARCHAR(40) NOT NULL DEFAULT 'cash',
  label VARCHAR(255) NOT NULL,
  reference VARCHAR(120),
  created_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_notifications (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  type VARCHAR(80) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'general',
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms')),
  audience VARCHAR(120) NOT NULL DEFAULT 'gym_manager',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(30) NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','danger')),
  status VARCHAR(30) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','queued','sent','failed')),
  entity_type VARCHAR(80),
  entity_id BIGINT,
  recipient_user_id BIGINT,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(80),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_files (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  entity_type VARCHAR(80) NOT NULL DEFAULT 'general',
  entity_id BIGINT,
  file_category VARCHAR(80) NOT NULL DEFAULT 'document',
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(160),
  file_size BIGINT,
  minio_bucket VARCHAR(120) NOT NULL,
  minio_object_key TEXT NOT NULL,
  uploaded_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_settings (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) UNIQUE NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'DT',
  default_due_day INT NOT NULL DEFAULT 5,
  occupancy_limit INT NOT NULL DEFAULT 80,
  renewal_warning_days INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_access_events (
  id BIGSERIAL PRIMARY KEY,
  code_entreprise VARCHAR(80) NOT NULL,
  member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL DEFAULT 'checkin',
  access_status VARCHAR(40) NOT NULL DEFAULT 'granted',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_templates (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  contract_type VARCHAR(80) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  name VARCHAR(180) NOT NULL,
  description TEXT,
  content_skeleton TEXT,
  mandatory_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_code, contract_type, language, name)
);

CREATE TABLE IF NOT EXISTS contracts (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  contract_number VARCHAR(80) NOT NULL,
  contract_type VARCHAR(80) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  status VARCHAR(40) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','ready_to_print')),
  member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
  subscription_id BIGINT REFERENCES gym_subscriptions(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
  template_id BIGINT REFERENCES contract_templates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by BIGINT,
  approved_by BIGINT,
  approved_at TIMESTAMP,
  ready_to_print_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_code, contract_number)
);

CREATE TABLE IF NOT EXISTS contract_versions (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_no INT NOT NULL,
  status VARCHAR(40) NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  ai_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, version_no)
);

CREATE TABLE IF NOT EXISTS contract_clauses (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  contract_type VARCHAR(80) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  clause_key VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'legal',
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 100,
  created_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_code, contract_type, language, clause_key)
);

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  provider VARCHAR(60) NOT NULL,
  model VARCHAR(120),
  prompt JSONB,
  response JSONB,
  status VARCHAR(40) NOT NULL DEFAULT 'success',
  error_message TEXT,
  tokens_used INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gym_members_tenant_branch ON gym_members(code_entreprise, branch_id);
CREATE INDEX IF NOT EXISTS idx_gym_subscriptions_tenant_branch ON gym_subscriptions(code_entreprise, branch_id);
CREATE INDEX IF NOT EXISTS idx_gym_coaches_tenant_branch ON gym_coaches(code_entreprise, branch_id);
CREATE INDEX IF NOT EXISTS idx_gym_payments_month_status ON gym_payments(month_ref, status);
CREATE INDEX IF NOT EXISTS idx_gym_notifications_tenant_status ON gym_notifications(tenant_code, status);
CREATE INDEX IF NOT EXISTS idx_gym_notifications_tenant_branch ON gym_notifications(tenant_code, branch_id);
CREATE INDEX IF NOT EXISTS idx_gym_files_tenant_branch ON gym_files(tenant_code, branch_id);
CREATE INDEX IF NOT EXISTS idx_gym_attendance_tenant_date ON gym_attendance(code_entreprise, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_gym_access_events_tenant_date ON gym_access_events(code_entreprise, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_contract_templates_lookup ON contract_templates(tenant_code, contract_type, language, name);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status ON contracts(tenant_code, status);
CREATE INDEX IF NOT EXISTS idx_contracts_member_subscription ON contracts(member_id, subscription_id);
CREATE INDEX IF NOT EXISTS idx_contract_versions_contract ON contract_versions(contract_id, version_no);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_lookup ON contract_clauses(tenant_code, contract_type, language);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_contract ON ai_generation_logs(contract_id, created_at);
