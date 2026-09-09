"""
HydroFab — Fab Utility Simulator
Generates realistic water/energy/recycling readings for 20 simulated
fab tools and writes them to PostgreSQL every 5 seconds.
~5 % of readings are deliberately anomalous (spikes / drops).
"""

import os
import sys
import time
import random
import signal
import logging
from datetime import datetime, timezone

import numpy as np
import psycopg2
from psycopg2.extras import execute_values

# ---------------------------------------------------------------------------
# Configuration (from environment, with sensible defaults)
# ---------------------------------------------------------------------------
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "hydrofab")
DB_USER     = os.getenv("DB_USER", "fab")
DB_PASSWORD = os.getenv("DB_PASSWORD", "fab_secret")

INTERVAL_SEC      = int(os.getenv("INTERVAL_SEC", "5"))
ANOMALY_CHANCE     = float(os.getenv("ANOMALY_CHANCE", "0.05"))   # 5 %
BASELINE_FRACTION  = 0.70   # normal readings centre at ~70 % of limit
BASELINE_NOISE     = 0.08   # ±8 % normal jitter (std-dev fraction)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("simulator")

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------
_running = True

def _shutdown(sig, frame):
    global _running
    log.info("Received %s — shutting down gracefully …", signal.Signals(sig).name)
    _running = False

signal.signal(signal.SIGINT,  _shutdown)
signal.signal(signal.SIGTERM, _shutdown)

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def connect_db(retries: int = 30, delay: float = 2.0):
    """Try to connect, with retries (useful when waiting for Postgres to boot)."""
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT,
                dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            )
            conn.autocommit = True
            log.info("Connected to PostgreSQL at %s:%s/%s (attempt %d)",
                     DB_HOST, DB_PORT, DB_NAME, attempt)
            return conn
        except psycopg2.OperationalError as exc:
            log.warning("DB connection attempt %d/%d failed: %s", attempt, retries, exc)
            if attempt == retries:
                raise
            time.sleep(delay)


def load_tools(conn):
    """Fetch tool definitions (id + limits) used for reading generation."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, water_limit_lph, energy_limit_kwh, min_recycling_pct "
            "FROM tools ORDER BY id"
        )
        rows = cur.fetchall()
    tools = []
    for row in rows:
        tools.append({
            "id":               row[0],
            "name":             row[1],
            "water_limit_lph":  float(row[2]),
            "energy_limit_kwh": float(row[3]),
            "min_recycling_pct": float(row[4]),
        })
    log.info("Loaded %d tool definitions", len(tools))
    return tools

# ---------------------------------------------------------------------------
# Reading generation
# ---------------------------------------------------------------------------

def generate_reading(tool: dict) -> dict:
    """
    Return a dict with water_lph, energy_kwh, recycling_pct, and an
    optional anomaly descriptor (None when the reading is normal).
    """
    # --- baseline (normal) values ---
    water   = np.random.normal(tool["water_limit_lph"]  * BASELINE_FRACTION,
                               tool["water_limit_lph"]  * BASELINE_NOISE)
    energy  = np.random.normal(tool["energy_limit_kwh"] * BASELINE_FRACTION,
                               tool["energy_limit_kwh"] * BASELINE_NOISE)
    recycle = np.random.normal(tool["min_recycling_pct"] + 8.0, 2.5)

    anomaly = None

    # --- anomaly injection (~5 % chance) ---
    if random.random() < ANOMALY_CHANCE:
        anomaly_type = random.choice(["water_spike", "energy_spike", "recycling_drop"])
        if anomaly_type == "water_spike":
            factor = random.uniform(1.4, 2.2)
            water *= factor
            anomaly = ("water_spike",
                       "critical" if water > tool["water_limit_lph"] * 1.5 else "warning")
        elif anomaly_type == "energy_spike":
            factor = random.uniform(1.4, 2.2)
            energy *= factor
            anomaly = ("energy_spike",
                       "critical" if energy > tool["energy_limit_kwh"] * 1.5 else "warning")
        else:  # recycling_drop
            drop = random.uniform(15.0, 40.0)
            recycle -= drop
            anomaly = ("recycling_drop",
                       "critical" if recycle < tool["min_recycling_pct"] - 20 else "warning")

    # Clamp to physical bounds
    water   = max(water, 0.0)
    energy  = max(energy, 0.0)
    recycle = max(min(recycle, 100.0), 0.0)

    return {
        "water_lph":     round(water, 2),
        "energy_kwh":    round(energy, 2),
        "recycling_pct": round(recycle, 2),
        "anomaly":       anomaly,
    }

# ---------------------------------------------------------------------------
# Threshold-based anomaly detection (runs on every reading)
# ---------------------------------------------------------------------------

def check_thresholds(tool: dict, reading: dict):
    """
    Return a list of (type, severity) tuples for any limit breaches,
    *including* those that were not injected deliberately — this catches
    edge-case normal readings that happen to exceed limits.
    """
    alerts = []
    if reading["water_lph"] > tool["water_limit_lph"]:
        sev = "critical" if reading["water_lph"] > tool["water_limit_lph"] * 1.3 else "warning"
        alerts.append(("water_spike", sev))
    if reading["energy_kwh"] > tool["energy_limit_kwh"]:
        sev = "critical" if reading["energy_kwh"] > tool["energy_limit_kwh"] * 1.3 else "warning"
        alerts.append(("energy_spike", sev))
    if reading["recycling_pct"] < tool["min_recycling_pct"]:
        sev = "critical" if reading["recycling_pct"] < tool["min_recycling_pct"] - 15 else "warning"
        alerts.append(("recycling_drop", sev))
    return alerts

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    conn  = connect_db()
    tools = load_tools(conn)

    log.info("Starting simulation loop  (interval=%ds, anomaly_chance=%.0f%%)",
             INTERVAL_SEC, ANOMALY_CHANCE * 100)

    cycle = 0
    while _running:
        cycle += 1
        now = datetime.now(timezone.utc)

        reading_rows = []   # (tool_id, water, energy, recycle, recorded_at)
        anomaly_rows = []   # (tool_id, reading_id_placeholder, type, severity, detected_at)

        for tool in tools:
            r = generate_reading(tool)
            reading_rows.append((
                tool["id"],
                r["water_lph"],
                r["energy_kwh"],
                r["recycling_pct"],
                now,
            ))

        # Bulk-insert readings and retrieve their IDs
        with conn.cursor() as cur:
            insert_sql = (
                "INSERT INTO readings (tool_id, water_lph, energy_kwh, recycling_pct, recorded_at) "
                "VALUES %s RETURNING id, tool_id"
            )
            result = execute_values(cur, insert_sql, reading_rows, fetch=True)

            # Map tool_id → reading_id for anomaly linking
            reading_id_map = {row[1]: row[0] for row in result}

        # Detect anomalies (threshold check) and insert
        anomaly_count = 0
        for tool, (_, water, energy, recycle, _) in zip(tools, reading_rows):
            reading_dict = {
                "water_lph": water,
                "energy_kwh": energy,
                "recycling_pct": recycle,
            }
            alerts = check_thresholds(tool, reading_dict)
            for atype, severity in alerts:
                anomaly_rows.append((
                    tool["id"],
                    reading_id_map[tool["id"]],
                    atype,
                    severity,
                    now,
                ))
                anomaly_count += 1

        if anomaly_rows:
            with conn.cursor() as cur:
                anomaly_sql = (
                    "INSERT INTO anomaly_events (tool_id, reading_id, type, severity, detected_at) "
                    "VALUES %s"
                )
                execute_values(cur, anomaly_sql, anomaly_rows)

        log.info("Cycle %d  |  %d readings  |  %d anomalies detected",
                 cycle, len(reading_rows), anomaly_count)

        # Sleep in small increments so shutdown is responsive
        for _ in range(INTERVAL_SEC * 10):
            if not _running:
                break
            time.sleep(0.1)

    log.info("Simulator stopped after %d cycles.", cycle)
    conn.close()


if __name__ == "__main__":
    main()
