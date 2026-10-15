import { afterEach, expect, it, vi } from "vitest";
import { getTranscriptions } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("shows the backend's own error message when a request fails", async () => {
  // Fake the backend replying with FastAPI's error format
  const errorResponse = new Response(JSON.stringify({ detail: "Model service is unavailable" }), { status: 503 });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse));

  await expect(getTranscriptions()).rejects.toThrow("Model service is unavailable");
});
