-- SaaS V2 foundation schema

CREATE TABLE IF NOT EXISTS saas_tenants (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(40) NOT NULL CHECK (type IN ('gym','hotel_spa')),
  subdomain VARCHAR(120) UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_licenses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  plan_name VARCHAR(80) NOT NULL,
  started_at DATE NOT NULL,
  ended_at DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  max_users INT NOT NULL DEFAULT 10,
  max_branches INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_contracts (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
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

CREATE TABLE IF NOT EXISTS payment_attempts (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL,
  attempt_no INT NOT NULL,
  result_status VARCHAR(40) NOT NULL
    CHECK (result_status IN ('success','failed','insufficient_funds','retry_scheduled')),
  failure_reason TEXT,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS hq_validation_queue (
  id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(80) NOT NULL,
  subscription_id BIGINT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','needs_update')),
  reviewer_id BIGINT,
  reviewer_comment TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hq_validation_queue_tenant_status
  ON hq_validation_queue (tenant_code, status);
