import { useState, type SubmitEvent } from "react";
import { transcribeFiles, type UploadResponse } from "./api";

// Same formats the backend accepts
const ACCEPTED_FORMATS = ".mp3,.wav,.m4a,.flac,.ogg";

export default function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Keep a reference to the form: event.currentTarget becomes null after the first await
    const form = event.currentTarget;
    setIsUploading(true);
    setUploadResponse(null);
    setErrorMessage("");
    try {
      setUploadResponse(await transcribeFiles(selectedFiles));
      // Clear the file picker so the same files aren't uploaded again by accident
      form.reset();
      setSelectedFiles([]);
      onUploaded();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* "multiple" lets the same input handle both single and batch uploads */}
        <input
          type="file"
          multiple
          accept={ACCEPTED_FORMATS}
          onChange={(event) => setSelectedFiles([...(event.target.files ?? [])])}
          className="min-w-0 text-sm text-graphite file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-rule file:bg-white file:px-3 file:py-2 file:font-medium file:text-ink hover:file:border-graphite"
        />
        <button
          type="submit"
          disabled={selectedFiles.length === 0 || isUploading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-signal px-4 py-2 font-medium text-white transition-colors enabled:hover:bg-signal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isUploading && (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />
          )}
          {isUploading
            ? "Transcribing…"
            : selectedFiles.length > 1
              ? `Transcribe ${selectedFiles.length} files`
              : "Transcribe"}
        </button>
      </div>

      {selectedFiles.length > 0 && (
        <ul className="text-sm text-graphite">
          {/* Index as key: two selected files can share a name, and this list is always replaced as a whole */}
          {selectedFiles.map((file, index) => (
            <li key={index} className="break-words">{file.name}</li>
          ))}
        </ul>
      )}

      {errorMessage && <p role="alert" className="text-sm text-fault">{errorMessage}</p>}

      {/* The backend returns a result per file, so show which succeeded and which failed */}
      {uploadResponse && (
        <div className="relative rounded-md border border-rule bg-white p-4 pr-10 text-sm">
          <button
            type="button"
            onClick={() => setUploadResponse(null)}
            aria-label="Dismiss results"
            className="absolute top-2 right-2 size-7 cursor-pointer rounded-md text-lg leading-none text-graphite transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
          >
            ×
          </button>
          <p className="font-medium">
            {uploadResponse.summary.succeeded} of {uploadResponse.summary.submitted} transcribed
          </p>
          <ul className="mt-2 space-y-2">
            {uploadResponse.results.map((result, index) => (
              <li key={index} className="break-words">
                {result.status === "success" ? (
                  <>
                    <span className="text-signal">✓</span> <span className="font-medium">{result.filename}</span>
                    {result.record.filename !== result.filename && (
                      <span className="text-graphite"> (saved as {result.record.filename})</span>
                    )}
                    <span className="mt-1 block font-serif text-base text-ink">{result.record.transcription}</span>
                  </>
                ) : (
                  <span className="text-fault">
                    ✗ <span className="font-medium">{result.filename}</span>: {result.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
