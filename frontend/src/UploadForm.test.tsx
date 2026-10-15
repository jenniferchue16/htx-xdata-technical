import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import UploadForm from "./UploadForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("uploads the selected files, shows a result for each and clears the picker", async () => {
  // Fake the backend: one file transcribed (and renamed as a duplicate), one rejected
  const uploadResponse = {
    summary: { submitted: 2, succeeded: 1, failed: 1 },
    results: [
      {
        filename: "sample.mp3",
        status: "success",
        record: { id: 1, filename: "sample_1.mp3", transcription: "Hello there", created_at: "2026-10-14T08:41:00Z" },
      },
      { filename: "notes.txt", status: "error", error: "Unsupported file type" },
    ],
  };
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(uploadResponse)));
  vi.stubGlobal("fetch", fetchMock);
  const onUploaded = vi.fn();
  const { container } = render(<UploadForm onUploaded={onUploaded} />);

  const fileInput = container.querySelector('input[type="file"]')!;
  fireEvent.change(fileInput, {
    target: { files: [new File(["audio"], "sample.mp3"), new File(["text"], "notes.txt")] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Transcribe 2 files" }));

  expect(await screen.findByText("1 of 2 transcribed")).toBeTruthy();
  expect(screen.getByText("(saved as sample_1.mp3)")).toBeTruthy();
  expect(screen.getByText("Hello there")).toBeTruthy();
  expect(screen.getByText(/Unsupported file type/)).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith("/api/transcribe", expect.objectContaining({ method: "POST" }));
  expect(onUploaded).toHaveBeenCalledTimes(1);
  // The picker is cleared, so the button is back to "Transcribe" and disabled until new files are chosen
  expect(screen.getByRole("button", { name: "Transcribe" })).toHaveProperty("disabled", true);
});
