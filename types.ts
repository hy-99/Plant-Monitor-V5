export interface Plant {
  id: string;
  name: string;
  snapshots: PlantSnapshot[];
}

export interface StorageUsage {
  bytesUsed: number;
  bytesLimit: number;
  bytesRemaining: number;
}

export interface PlantSnapshot {
  id: string;
  imageUrl: string;
  imageDataUrl?: string;
  analysis: AnalysisResult;
  timestamp: string;
  summary?: string;
}

export interface CareAdvice {
  title: string;
  description: string;
}

export interface SpeciesCandidate {
  name: string;
  confidence: number;
}

export interface AnalysisResult {
  isPlant: boolean;
  confidence: number;
  plantGateSource?: 'plant_gate_gemini' | 'direct_analysis' | 'other';
  plantGateConfidence?: number;
  species: string | null;
  commonName: string | null;
  speciesCandidates?: SpeciesCandidate[];
  health: 'Healthy' | 'Stressed' | 'Unhealthy' | 'Unknown';
  height: string | null;
  width: string | null;
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

export interface User {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ChatSource {
  title: string;
  url: string;
}

export type ChatMode = 'plant' | 'casual' | 'web';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  mode: ChatMode;
  sources?: ChatSource[];
  plantId?: string | null;
}

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  plantId: string | null;
  title: string;
  notes: string | null;
  dueAt: string;
  recurrence: ReminderRecurrence;
  completedAt: string | null;
  lastCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestAnalysisResult {
  summary: string;
  analysis: AnalysisResult;
}
