-- Up Migration

-- Idempotency Keys Table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL,
    workspace_id VARCHAR NOT NULL,
    action INT NOT NULL,
    key VARCHAR NOT NULL,
    reference_id VARCHAR NOT NULL,
    reference_type INT NOT NULL,
    request_fingerprint VARCHAR,
    response_snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expired_at TIMESTAMP
);

-- Index for idempotency_keys
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(tenant_id, workspace_id, action, key);

-- Down Migration
DROP TABLE IF EXISTS idempotency_keys;
