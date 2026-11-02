CREATE TABLE external_events (
    id          VARCHAR(255) PRIMARY KEY,
    kind        VARCHAR(255) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    routed_at   TIMESTAMP WITH TIME ZONE,
    raw         VARCHAR NOT NULL
);

CREATE INDEX idx_external_events_source_name ON external_events (source_name);