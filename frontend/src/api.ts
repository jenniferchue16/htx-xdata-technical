// All backend calls go through /api, which is forwarded to the backend (by Vite in development, nginx in Docker)
const API_URL = "/api";

export type Transcription = {
  id: number;
  filename: string;
  transcription: string;
  created_at: string; // UTC, e.g. 2026-10-12T12:35:36Z
};

// The backend returns one result per uploaded file
export type UploadResult =
  | { filename: string; status: "success"; record: Transcription }
  | { filename: string; status: "error"; error: string };

export type UploadResponse = {
  summary: { submitted: number; succeeded: number; failed: number };
  results: UploadResult[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // FastAPI returns errors as {"detail": "..."}
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (HTTP ${response.status})`);
  }
  return response.json();
}

export function transcribeFiles(files: File[]) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return request<UploadResponse>("/transcribe", { method: "POST", body: formData });
}

export function getTranscriptions() {
  return request<Transcription[]>("/transcriptions");
}

export function searchTranscriptions(filename: string) {
  return request<Transcription[]>(`/search?filename=${encodeURIComponent(filename)}`);
}
