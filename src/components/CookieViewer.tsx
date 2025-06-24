import React, { useState, useEffect, useRef } from "react";
import ShadowIn from "./animations/ShadowIn";

const getAllCookies = () => {
  if (typeof document === "undefined") return {};
  return document.cookie.split("; ").reduce((acc, cookie) => {
    const [key, ...v] = cookie.split("=");
    acc[key] = decodeURIComponent(v.join("="));
    return acc;
  }, {} as Record<string, string>);
};

export default function CookieViewer() {
  const [cookies, setCookies] = useState<Record<string, string>>(getAllCookies());
  const [input, setInput] = useState("");
  const [cookieValue, setCookieValue] = useState<string | null>(null);
  const lastCookiesRef = useRef("");

  // Poll for cookie changes every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const all = getAllCookies();
      const serialized = JSON.stringify(all);
      if (serialized !== lastCookiesRef.current) {
        setCookies(all);
        lastCookiesRef.current = serialized;
        // If a cookie is being viewed, update its value
        if (input && input in all) {
          setCookieValue(all[input]);
        } else if (input) {
          setCookieValue(null);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [input]);

  const handleReadCookie = (e: React.FormEvent) => {
    e.preventDefault();
    const all = getAllCookies();
    setCookies(all);
    setCookieValue(input in all ? all[input] : null);
  };

  // Helper: get only todo cookies
  const getTodoCookies = () => {
    const todoCookies: Record<string, string> = {};
    Object.keys(cookies).forEach((key) => {
      if (/^todos\d+$/.test(key)) {
        todoCookies[key] = cookies[key];
      }
    });
    return todoCookies;
  };

  const [showExport, setShowExport] = useState(false);
  const exportString = JSON.stringify(getTodoCookies(), null, 2);
  const [showImport, setShowImport] = useState(false);
  const [importString, setImportString] = useState("");
  const [importError, setImportError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleImport = () => {
    setImportError("");
    try {
      const data = JSON.parse(importString);
      if (!data || typeof data !== "object") throw new Error("Invalid format");
      Object.entries(data).forEach(([key, value]) => {
        if (/^todos\d+$/.test(key) && typeof value === "string") {
          document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000`;
        }
      });
      setImportString("");
      setShowImport(false);
      // JIT update: force a reload so all components see the new cookies immediately
      window.location.reload();
    } catch (e) {
      setImportError("Invalid JSON or format.");
    }
  };

  const deleteCookie = (key: string) => {
    document.cookie = `${key}=; path=/; max-age=0`;
    setCookies(getAllCookies());
  };

  const cleanUpCookies = () => {
    // Remove all todos cookies (todos1, todos2, etc) and the base todos key
    let changed = false;
    for (let i = 1; i <= 20; i++) {
      document.cookie = `todos${i}=; path=/; max-age=0`;
      changed = true;
    }
    document.cookie = `todos=; path=/; max-age=0`;
    document.cookie = `__next_hmr_refresh_hash__=; path=/; max-age=0`;
    changed = true;
    if (changed) window.location.reload();
  };

  return (
    <ShadowIn className="w-full" shadowColor="white">
      <div className="card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto">
        <main className="flex flex-col gap-6 w-full max-w-md">
          <h2 className="text-5xl title text-left my-2">import/export</h2>
          <div className="mb-4 grid grid-cols-3 gap-2 w-full">
            <div className="col-span-2 flex gap-2">
              <button
                className="btn px-3 py-1 rounded bg-muted font-bold mb-2"
                onClick={() => setShowExport((v) => !v)}
                type="button"
              >
                {showExport ? "Hide Export" : "Export"}
              </button>
              <button
                className="btn px-3 py-1 rounded bg-muted font-bold mb-2"
                onClick={() => setShowImport((v) => !v)}
                type="button"
              >
                {showImport ? "Hide Import" : "Import"}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                className="card btn px-3 py-1 rounded text-white font-bold mb-2"
                onClick={cleanUpCookies}
                type="button"
              >
                RESET
              </button>
            </div>
          </div>
          {showExport && (
            <div className="flex flex-col gap-2 items-end w-full">
              <textarea
                className="w-full bg-muted p-2 rounded text-xs font-mono mb-2"
                rows={6}
                readOnly
                value={exportString}
                onFocus={e => e.target.select()}
              />
              <button
                className="btn px-3 py-1 rounded bg-accent font-bold w-fit"
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(exportString);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          {showImport && (
            <div className="flex flex-col gap-2 mt-2 items-end w-full">
              <textarea
                className="w-full bg-muted p-2 rounded text-xs font-mono"
                rows={6}
                value={importString}
                onChange={e => setImportString(e.target.value)}
                placeholder="Paste exported todos JSON here"
              />
              <div className="flex gap-2">
                <button
                  className="btn px-3 py-1 rounded bg-accent font-bold w-fit"
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setImportString(text);
                    } catch {}
                  }}
                >
                  Paste
                </button>
                <button
                  className="card btn px-3 py-1 rounded bg-accent font-bold w-fit card btn text-white"
                  type="button"
                  onClick={handleImport}
                >
                  Import
                </button>
              </div>
              {importError && <span className="text-red-500 text-xs self-start">{importError}</span>}
            </div>
          )}
        </main>
      </div>
    </ShadowIn>
  );
}
