const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const fetchAnalytics = () => request<import('../types/api').AnalyticsResponse>('/analytics');
export const fetchAlerts = () => request<import('../types/api').AlertItem[]>('/alerts');
export const fetchEvents = () => request<import('../types/api').EventItem[]>('/events');
export const fetchCameraStatus = () => request<import('../types/api').CameraStatusItem[]>('/camera-status');
export const fetchProcessingStatus = (taskId: string) => request<import('../types/api').JobStatusItem>(`/processing-status/${taskId}`);

export async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload-video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}