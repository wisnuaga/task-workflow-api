-- Up Migration

-- Add composite unique index on (tenant_id, workspace_id, id)
-- This enforces that task IDs are unique within a tenant/workspace scope
-- and provides optimal query performance for multi-tenant lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_tenant_workspace_id 
ON tasks(tenant_id, workspace_id, id);

-- Add index to optimize the assignTask UPDATE query with optimistic locking
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_workspace_id_version 
ON tasks(tenant_id, workspace_id, id, version);

-- Down Migration
-- DROP INDEX IF EXISTS idx_tasks_tenant_workspace_id_version;
-- DROP INDEX IF EXISTS idx_tasks_tenant_workspace_id;
