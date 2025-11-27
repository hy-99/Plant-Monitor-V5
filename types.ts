export interface Plant {
  id: string;
  name: string;
  snapshots: PlantSnapshot[];
}

export interface PlantSnapshot {
  id: string;
  imageUrl: string;
  analysis: AnalysisResult;
  timestamp: string; // ISO date string
  summary?: string;
}

export interface CareAdvice {
  title: string;
  description: string;
}

export interface SpeciesCandidate {
  name: string;
  confidence: number; // 0.0–1.0
}

export interface AnalysisResult {
  // final overall verdict from the main analysis
  isPlant: boolean;
  confidence: number; // interpret this as: "confidence it really is a plant"

  // NEW (optional) – where the plant decision came from & its own confidence
  plantGateSource?: 'plant_gate_gemini' | 'direct_analysis' | 'other';
  plantGateConfidence?: number; // 0.0–1.0 (from the pre-check)

  // species info
  species: string | null;
  commonName: string | null;

  // NEW (optional) – list of candidate species (for future improvements)
  speciesCandidates?: SpeciesCandidate[];

  health: 'Healthy' | 'Stressed' | 'Unhealthy' | 'Unknown';
  height: string | null; // e.g., "15 cm"
  width: string | null; // e.g., "10 cm"
  disease: DiseaseInfo | null;
  advice: CareAdvice[];
  feedback?: {
    rating: 'correct' | 'incorrect';
    comment?: string;
  };
}



export interface DiseaseInfo {
  name: string;
  severity: string;
  recommendations: string[];
}