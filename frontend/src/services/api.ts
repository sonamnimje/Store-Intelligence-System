const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://store-intelligence-system-r18r.onrender.com';

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

export async function uploadVideo(file: File, onProgress?: (percent: number) => void) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload-video`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          resolve(json);
        } catch (err) {
          resolve({});
        }
      } else {
        const body = xhr.responseText || '';
        reject(new Error(`Upload failed: ${xhr.status} ${body}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        try {
          onProgress(pct);
        } catch (_) {}
      }
    };

    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}