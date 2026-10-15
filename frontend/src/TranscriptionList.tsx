// Lists all transcriptions, or those whose file name matches the search
import { useEffect, useState, type SubmitEvent } from "react";
import { getTranscriptions, searchTranscriptions, type Transcription } from "./api";

export default function TranscriptionList({ refreshKey }: { refreshKey: number }) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [searchText, setSearchText] = useState("");
  // The search currently shown in the list; "" means all transcriptions
  const [activeSearch, setActiveSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load when the search changes, and again after each upload (refreshKey changes)
  useEffect(() => {
    // Ignore responses from an older request that finish after a newer one
    let isCurrentRequest = true;
    const request = activeSearch ? searchTranscriptions(activeSearch) : getTranscriptions();
    request
      .then((data) => {
        if (isCurrentRequest) {
          setTranscriptions(data);
          setErrorMessage("");
        }
      })
      .catch((error: Error) => {
        if (isCurrentRequest) {
          setErrorMessage(error.message);
        }
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [activeSearch, refreshKey]);

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveSearch(searchText.trim());
  }

  function handleClear() {
    setSearchText("");
    setActiveSearch("");
  }

  const count = transcriptions.length;

  return (
    <section className="mt-14 border-t border-ink pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-2xl font-medium">Transcriptions</h2>
        <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
          <input
            type="search"
            placeholder="Search by file name"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-rule bg-white px-3 py-2 text-sm placeholder:text-graphite focus:border-signal focus:outline-none sm:w-64"
          />
          <button
            type="submit"
            disabled={!searchText.trim()}
            className="cursor-pointer rounded-md border border-rule bg-white px-3 py-2 text-sm font-medium transition-colors enabled:hover:border-graphite enabled:hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-40"
          >
            Search
          </button>
          {activeSearch && (
            <button
              type="button"
              onClick={handleClear}
              className="cursor-pointer rounded-md px-2 py-2 text-sm text-graphite underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-signal"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {errorMessage && <p role="alert" className="mt-4 text-sm text-fault">{errorMessage}</p>}

      {/* Hidden while there's an error, so a failed load isn't mistaken for an empty list */}
      {!errorMessage && (
        <p className="mt-4 text-sm text-graphite">
          {activeSearch
            ? count === 0
              ? `No file names contain "${activeSearch}".`
              : `${count} ${count === 1 ? "result" : "results"} for "${activeSearch}"`
            : count === 0
              ? "No transcriptions yet. Upload a recording to create one."
              : `${count} ${count === 1 ? "transcription" : "transcriptions"}`}
        </p>
      )}

      <ul className="mt-2 divide-y divide-rule">
        {transcriptions.map((transcription) => (
          <li key={transcription.id} className="py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-medium break-all">{transcription.filename}</p>
              {/* created_at is UTC; show it in the viewer's local time */}
              <time dateTime={transcription.created_at} className="text-sm text-graphite">
                {new Date(transcription.created_at).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p className="mt-2 max-w-[65ch] font-serif text-lg leading-relaxed">{transcription.transcription}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
