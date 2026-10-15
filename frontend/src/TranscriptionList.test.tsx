import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TranscriptionList from "./TranscriptionList";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("only searches when Search is clicked, then shows the matching transcriptions", async () => {
  const match = { id: 1, filename: "sample.mp3", transcription: "Hello there", created_at: "2026-10-14T08:41:00Z" };
  // Fake the backend: an empty list at first, and one match for any search
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(new Response(JSON.stringify(url.startsWith("/api/search") ? [match] : []))),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<TranscriptionList refreshKey={0} />);
  await screen.findByText("No transcriptions yet. Upload a recording to create one.");

  // Typing alone sends no request (only the initial list load so far)
  fireEvent.change(screen.getByPlaceholderText("Search by file name"), { target: { value: "sample" } });
  expect(fetchMock).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(await screen.findByText('1 result for "sample"')).toBeTruthy();
  expect(screen.getByText("sample.mp3")).toBeTruthy();
  expect(fetchMock).toHaveBeenLastCalledWith("/api/search?filename=sample", undefined);
});
