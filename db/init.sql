-- ============================================================
-- HydroFab — Fab Utility Monitor
-- Database Schema & Seed Data
-- ============================================================

-- -----------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------

CREATE TABLE tools (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL,
    zone               VARCHAR(50)  NOT NULL,
    water_limit_lph    NUMERIC(10,2) NOT NULL,
    energy_limit_kwh   NUMERIC(10,2) NOT NULL,
    min_recycling_pct  NUMERIC(5,2)  NOT NULL DEFAULT 80.0
);

CREATE TABLE readings (
    id             BIGSERIAL PRIMARY KEY,
    tool_id        INT          NOT NULL REFERENCES tools(id),
    water_lph      NUMERIC(10,2) NOT NULL,
    energy_kwh     NUMERIC(10,2) NOT NULL,
    recycling_pct  NUMERIC(5,2)  NOT NULL,
    recorded_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_readings_tool_time ON readings (tool_id, recorded_at DESC);

CREATE TABLE anomaly_events (
    id             BIGSERIAL PRIMARY KEY,
    tool_id        INT          NOT NULL REFERENCES tools(id),
    reading_id     BIGINT       NOT NULL REFERENCES readings(id),
    type           VARCHAR(30)  NOT NULL,
    severity       VARCHAR(10)  NOT NULL,
    detected_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resolved       BOOLEAN      NOT NULL DEFAULT false
);

CREATE INDEX idx_anomaly_unresolved ON anomaly_events (resolved, detected_at DESC)
    WHERE resolved = false;

-- -----------------------------------------------------------
-- 2. SEED DATA — 20 tools across 4 zones
-- -----------------------------------------------------------

INSERT INTO tools (name, zone, water_limit_lph, energy_limit_kwh, min_recycling_pct) VALUES
  -- Etch Bay (high water usage, moderate energy)
  ('Etch Tool 01',       'Etch Bay',       150.00, 12.00, 82.0),
  ('Etch Tool 02',       'Etch Bay',       160.00, 11.50, 80.0),
  ('Etch Tool 03',       'Etch Bay',       140.00, 13.00, 83.0),
  ('Etch Tool 04',       'Etch Bay',       170.00, 10.00, 81.0),
  ('Etch Tool 05',       'Etch Bay',       155.00, 14.50, 80.0),

  -- Deposition Bay (moderate water, higher energy)
  ('CVD Chamber 01',     'Deposition Bay', 130.00, 16.00, 80.0),
  ('CVD Chamber 02',     'Deposition Bay', 125.00, 15.50, 82.0),
  ('PVD Chamber 01',     'Deposition Bay', 110.00, 17.00, 78.0),
  ('PVD Chamber 02',     'Deposition Bay', 115.00, 18.00, 79.0),
  ('ALD Tool 01',        'Deposition Bay', 100.00, 14.00, 85.0),

  -- Assembly Bay (lower water, moderate energy)
  ('Wire Bond 01',       'Assembly Bay',    80.00,  7.50, 80.0),
  ('Wire Bond 02',       'Assembly Bay',    85.00,  8.00, 80.0),
  ('Die Attach 01',      'Assembly Bay',    75.00,  6.50, 82.0),
  ('Packaging Line 01',  'Assembly Bay',    90.00,  9.00, 78.0),
  ('Packaging Line 02',  'Assembly Bay',    95.00,  8.50, 80.0),

  -- Test Bay (low water, higher energy for burn-in)
  ('Burn-In Oven 01',    'Test Bay',        60.00, 18.00, 75.0),
  ('Burn-In Oven 02',    'Test Bay',        55.00, 19.00, 76.0),
  ('Final Test 01',      'Test Bay',        50.00, 15.00, 80.0),
  ('Final Test 02',      'Test Bay',        45.00, 14.00, 80.0),
  ('Inspection Station',  'Test Bay',       40.00, 12.00, 85.0);
