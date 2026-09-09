// ----------------------------------------------------------------
// Data models matching the C# API response shapes
// ----------------------------------------------------------------

export interface Tool {
  id: number;
  name: string;
  zone: string;
  waterLimitLph: number;
  energyLimitKwh: number;
  minRecyclingPct: number;
}

export interface ToolStatus {
  toolId: number;
  toolName: string;
  zone: string;
  waterLph: number | null;
  energyKwh: number | null;
  recyclingPct: number | null;
  recordedAt: string | null;
  waterLimitLph: number;
  energyLimitKwh: number;
  minRecyclingPct: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface Reading {
  id: number;
  toolId: number;
  waterLph: number;
  energyKwh: number;
  recyclingPct: number;
  recordedAt: string;
}

export interface AnomalyAlert {
  id: number;
  toolId: number;
  toolName: string;
  type: 'water_spike' | 'energy_spike' | 'recycling_drop';
  severity: 'warning' | 'critical';
  detectedAt: string;
  resolved: boolean;
}
