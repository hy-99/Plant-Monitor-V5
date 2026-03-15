import { AuthResponse, ChatMessage, ChatMode, ChatSource, GuestAnalysisResult, Plant, PlantSnapshot, Reminder, StorageUsage, User } from '../types';

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isLocalFrontend =
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      (port === '3000' || port === '5173');

    // Prefer Vite's dev proxy for local development even if the env file still points at localhost:8000.
    if (isLocalFrontend && configured && /^https?:\/\/(localhost|127\.0\.0\.1):8000\/api\/?$/i.test(configured)) {
      return '/api';
    }

    if (!configured && isLocalFrontend) {
      return '/api';
    }

    if (!configured && protocol.startsWith('http')) {
      return `${window.location.origin}/api`;
    }
  }

  return configured || '/api';
};

const API_BASE_URL = resolveApiBaseUrl().replace(/\/$/, '');

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const request = async <T>(path: string, options: { method?: HttpMethod; token?: string | null; body?: unknown } = {}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error && /failed to fetch/i.test(error.message)
        ? 'Unable to reach the Plant Monitor API. Make sure the server is running on port 8000.'
        : error instanceof Error
          ? error.message
          : 'Unable to reach the Plant Monitor API.'
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || errorBody?.detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const register = (payload: { name: string; username: string; password: string }) =>
  request<AuthResponse>('/auth/register', { method: 'POST', body: payload });

export const login = (payload: { username: string; password: string }) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: payload });

export const getCurrentUser = async (token: string) => {
  const response = await request<{ user: User }>('/auth/me', { token });
  return response.user;
};

export const updateCurrentUser = async (token: string, payload: { name: string }) => {
  const response = await request<{ user: User }>('/auth/me', {
    method: 'PATCH',
    token,
    body: payload,
  });
  return response.user;
};

export const getPlants = async (token: string) => {
  const response = await request<{ plants: Plant[] }>('/plants', { token });
  return response.plants;
};

export const getStorageUsage = async (token: string) => {
  const response = await request<{ usage: StorageUsage }>('/storage', { token });
  return response.usage;
};

export const getReminders = async (token: string) => {
  const response = await request<{ reminders: Reminder[] }>('/reminders', { token });
  return response.reminders;
};

export const createPlant = async (token: string, payload: { name: string; imageDataUrl: string }) => {
  const response = await request<{ plant: Plant; usage: StorageUsage }>('/plants', { method: 'POST', token, body: payload });
  return response.plant;
};

export const renamePlant = async (token: string, plantId: string, name: string) => {
  const response = await request<{ plant: Pick<Plant, 'id' | 'name'> }>(`/plants/${plantId}`, {
    method: 'PATCH',
    token,
    body: { name },
  });
  return response.plant;
};

export const addSnapshot = async (token: string, plantId: string, imageDataUrl: string) => {
  const response = await request<{ snapshot: PlantSnapshot; usage: StorageUsage }>(`/plants/${plantId}/snapshots`, {
    method: 'POST',
    token,
    body: { imageDataUrl },
  });
  return response.snapshot;
};

export const deleteSnapshot = (token: string, plantId: string, snapshotId: string) =>
  request<void>(`/plants/${plantId}/snapshots/${snapshotId}`, {
    method: 'DELETE',
    token,
  });

export const saveFeedback = async (
  token: string,
  plantId: string,
  snapshotId: string,
  feedback: { rating: 'correct' | 'incorrect'; comment?: string }
) => {
  const response = await request<{ snapshot: { id: string; analysis: PlantSnapshot['analysis'] } }>(
    `/plants/${plantId}/snapshots/${snapshotId}/feedback`,
    {
      method: 'PATCH',
      token,
      body: feedback,
    }
  );

  return response.snapshot;
};

export const sendChat = async (
  token: string,
  payload: {
    question: string;
    plantId: string | null;
    mode: ChatMode;
    history: ChatMessage[];
  }
) => {
  const response = await request<{ answer: string; sources: ChatSource[]; messages: ChatMessage[] }>('/chat', {
    method: 'POST',
    token,
    body: payload,
  });

  return response;
};

export const getChatHistory = async (token: string, plantId: string | null) => {
  const query = plantId ? `?plantId=${encodeURIComponent(plantId)}` : '';
  const response = await request<{ messages: ChatMessage[] }>(`/chat/history${query}`, {
    token,
  });
  return response.messages;
};

export const createReminder = async (
  token: string,
  payload: { plantId: string | null; title: string; notes?: string; dueAt: string; recurrence: Reminder['recurrence'] }
) => {
  const response = await request<{ reminder: Reminder }>('/reminders', {
    method: 'POST',
    token,
    body: payload,
  });
  return response.reminder;
};

export const updateReminder = async (
  token: string,
  reminderId: string,
  payload: { plantId: string | null; title: string; notes?: string; dueAt: string; recurrence: Reminder['recurrence'] }
) => {
  const response = await request<{ reminder: Reminder }>(`/reminders/${reminderId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
  return response.reminder;
};

export const completeReminder = async (token: string, reminderId: string) => {
  const response = await request<{ reminder: Reminder }>(`/reminders/${reminderId}/complete`, {
    method: 'PATCH',
    token,
  });
  return response.reminder;
};

export const deleteReminder = (token: string, reminderId: string) =>
  request<void>(`/reminders/${reminderId}`, {
    method: 'DELETE',
    token,
  });

export const guestAnalyze = async (imageDataUrl: string) =>
  request<GuestAnalysisResult>('/guest/analyze', {
    method: 'POST',
    body: { imageDataUrl },
  });
