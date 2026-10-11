"""
HydroFab — Fab Utility Simulator & Machine Learning Anomaly Detector
Generates realistic water/energy/recycling readings for 20 simulated
fab tools and writes them to PostgreSQL every 5 seconds.
Equipped with an unsupervised Scikit-Learn Isolation Forest & Rolling Z-Score
engine for real-time multivariate anomaly detection.
"""

import os
import sys
import time
import random
import signal
import logging
from collections import deque
from datetime import datetime, timezone

import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from sklearn.ensemble import IsolationForest

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
# Machine Learning Anomaly Detector (Isolation Forest + Rolling Z-Score)
# ---------------------------------------------------------------------------

class IsolationForestDetector:
    """
    Unsupervised Multivariate Anomaly Detection Engine.
    Combines:
      1. Scikit-Learn IsolationForest for joint multi-sensor distribution modeling
      2. Rolling Z-Score buffer for continuous dynamic tool baselining and feature attribution
      3. Industrial safety envelope guardrails (failsafe interlock)
    """
    def __init__(self, tools: list[dict], contamination: float = 0.05, window_size: int = 50):
        self.contamination = contamination
        self.window_size = window_size
        self.history: dict[int, deque] = {tool["id"]: deque(maxlen=window_size) for tool in tools}
        self.models: dict[int, IsolationForest] = {}
        self._initialize_models(tools)

    def _initialize_models(self, tools: list[dict]):
        """
        Calibrate an Isolation Forest model per tool on nominal baseline operations.
        Uses 300 synthetic reference observations per tool simulating normal operating jitter.
        """
        log.info("Calibrating Scikit-Learn Isolation Forest detectors for %d tools...", len(tools))
        for tool in tools:
            # Generate nominal training distribution
            w_norm = np.random.normal(tool["water_limit_lph"] * BASELINE_FRACTION,
                                      tool["water_limit_lph"] * BASELINE_NOISE, 300)
            e_norm = np.random.normal(tool["energy_limit_kwh"] * BASELINE_FRACTION,
                                      tool["energy_limit_kwh"] * BASELINE_NOISE, 300)
            r_norm = np.random.normal(tool["min_recycling_pct"] + 8.0, 2.5, 300)

            # Feature vector: [water_ratio, energy_ratio, recycle_ratio]
            X_train = np.column_stack([
                w_norm / tool["water_limit_lph"],
                e_norm / tool["energy_limit_kwh"],
                r_norm / tool["min_recycling_pct"],
            ])

            model = IsolationForest(
                n_estimators=100,
                contamination=self.contamination,
                random_state=42 + tool["id"],
                n_jobs=1,
            )
            model.fit(X_train)
            self.models[tool["id"]] = model

            # Pre-populate rolling history window
            for w, e, r in zip(w_norm[-self.window_size:], e_norm[-self.window_size:], r_norm[-self.window_size:]):
                self.history[tool["id"]].append((w, e, r))

        log.info("✓ Isolation Forest detectors calibrated and active across all 20 tools.")

    def detect(self, tool: dict, reading: dict) -> list[tuple[str, str, float]]:
        """
        Evaluate reading against Isolation Forest and Rolling Z-Score engine.
        Returns a list of (anomaly_type, severity, ml_score) tuples.
        """
        tid = tool["id"]
        w = reading["water_lph"]
        e = reading["energy_kwh"]
        r = reading["recycling_pct"]

        # Feature vector normalized against tool limits
        X_test = np.array([[
            w / tool["water_limit_lph"],
            e / tool["energy_limit_kwh"],
            r / tool["min_recycling_pct"],
        ]])

        model = self.models.get(tid)
        if not model:
            return []

        # Isolation Forest score: negative values indicate anomalies
        score = float(model.decision_function(X_test)[0])
        is_if_anomaly = model.predict(X_test)[0] == -1

        # Rolling statistics for individual feature attribution
        hist = self.history[tid]
        if len(hist) >= 10:
            arr = np.array(hist)
            means = np.mean(arr, axis=0)
            stds = np.std(arr, axis=0)
            # Avoid division by zero
            stds = np.maximum(stds, [0.5, 0.1, 0.5])
            z_w = (w - means[0]) / stds[0]
            z_e = (e - means[1]) / stds[1]
            z_r = (means[2] - r) / stds[2]  # Drop is anomalous
        else:
            z_w = (w - tool["water_limit_lph"] * BASELINE_FRACTION) / (tool["water_limit_lph"] * BASELINE_NOISE)
            z_e = (e - tool["energy_limit_kwh"] * BASELINE_FRACTION) / (tool["energy_limit_kwh"] * BASELINE_NOISE)
            z_r = ((tool["min_recycling_pct"] + 8.0) - r) / 2.5

        # Update sliding window (store normal points to avoid baseline drift poisoning)
        if not is_if_anomaly and max(z_w, z_e, z_r) < 2.5:
            hist.append((w, e, r))

        # Industrial Safety Envelope Guardrails (physical limit checks)
        breached_w = w > tool["water_limit_lph"]
        breached_e = e > tool["energy_limit_kwh"]
        breached_r = r < tool["min_recycling_pct"]

        max_z = max(z_w, z_e, z_r)
        has_anomaly = is_if_anomaly or max_z >= 2.5 or breached_w or breached_e or breached_r

        if not has_anomaly:
            return []

        # Feature attribution: which metric contributed most to the anomaly?
        z_dict = {"water_spike": z_w, "energy_spike": z_e, "recycling_drop": z_r}
        primary_type = max(z_dict, key=z_dict.get)

        # Severity classification:
        # Critical if extreme ML anomaly (score < -0.15), extreme z-score (>= 3.5), or catastrophic limit breach (>130%)
        is_critical = (
            score < -0.15
            or max_z >= 3.5
            or (breached_w and w > tool["water_limit_lph"] * 1.3)
            or (breached_e and e > tool["energy_limit_kwh"] * 1.3)
            or (breached_r and r < tool["min_recycling_pct"] - 15)
        )
        severity = "critical" if is_critical else "warning"

        log.info("[ML Anomaly] Tool '%s' (#%d): %s [%s] | IF Score: %.3f | Z-scores: W=%.2f, E=%.2f, R=%.2f",
                 tool["name"], tid, primary_type, severity, score, z_w, z_e, z_r)

        return [(primary_type, severity, score)]

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    conn  = connect_db()
    tools = load_tools(conn)

    # Initialize ML Anomaly Detector
    detector = IsolationForestDetector(tools)

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

        # Detect anomalies using ML Isolation Forest & Rolling Z-Score engine
        anomaly_count = 0
        for tool, (_, water, energy, recycle, _) in zip(tools, reading_rows):
            reading_dict = {
                "water_lph": water,
                "energy_kwh": energy,
                "recycling_pct": recycle,
            }
            alerts = detector.detect(tool, reading_dict)
            for atype, severity, _ in alerts:
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

        log.info("Cycle %d  |  %d readings  |  %d anomalies detected [Isolation Forest Active]",
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
