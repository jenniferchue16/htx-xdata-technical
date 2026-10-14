import { useState } from "react";
import TranscriptionList from "./TranscriptionList";
import UploadForm from "./UploadForm";

export default function App() {
  // Incremented after each upload so the transcription list reloads
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <header className="mb-8">
        <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Transcribe recordings</h1>
        <p className="mt-3 text-graphite">Upload MP3, WAV, M4A, FLAC or OGG files to turn speech into text.</p>
      </header>

      <UploadForm onUploaded={() => setRefreshKey((key) => key + 1)} />

      <TranscriptionList refreshKey={refreshKey} />
    </main>
  );
}
