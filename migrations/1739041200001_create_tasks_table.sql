-- Up Migration

-- Enable uuid-ossp extension if not already enabled (for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL,
    workspace_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    priority INT,
    state INT,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_workspace ON tasks(tenant_id, workspace_id);

-- Version Auto-Increment Trigger Function
CREATE OR REPLACE FUNCTION update_task_version_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER before_update_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_version_timestamp();

-- Down Migration
DROP TRIGGER IF EXISTS before_update_tasks ON tasks;
DROP FUNCTION IF EXISTS update_task_version_timestamp();
DROP TABLE IF EXISTS tasks;
