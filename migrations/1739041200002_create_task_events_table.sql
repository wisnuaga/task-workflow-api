-- Up Migration

-- Task Events Table
CREATE TABLE IF NOT EXISTS task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL,
    workspace_id VARCHAR NOT NULL,
    event_type INT NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for task_events
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);

-- Down Migration
DROP TABLE IF EXISTS task_events;
