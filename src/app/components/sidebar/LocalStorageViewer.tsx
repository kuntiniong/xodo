import React, { useState, useEffect, useRef } from "react";
import ShadowIn from "@/components/animations/ShadowIn";

// Helper to get all localStorage items as an object
const getAllLocalStorage = (): Record<string, string> => {
  if (typeof window === "undefined" || !window.localStorage) return {};
  const storage: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      storage[key] = localStorage.getItem(key) || "";
    }
  }
  return storage;
};

export default function LocalStorageViewer() {
  const [items, setItems] = useState<Record<string, string>>(getAllLocalStorage());
  const lastItemsRef = useRef("");

  // Poll for localStorage changes every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const all = getAllLocalStorage();
      const serialized = JSON.stringify(all);
      if (serialized !== lastItemsRef.current) {
        setItems(all);
        lastItemsRef.current = serialized;
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Helper: get only localStorage items that are related to todos.
  const getTodoItems = () => {
    const todoItems: Record<string, string> = {};
    Object.keys(items).forEach((key) => {
      if (/^todos\d+$/.test(key)) {
        todoItems[key] = items[key];
      }
    });
    return todoItems;
  };

  const [showExport, setShowExport] = useState(false);
  const exportString = JSON.stringify(getTodoItems(), null, 2);
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
          localStorage.setItem(key, value);
        }
      });
      setImportString("");
      setShowImport(false);
      // Reload to update all components with the new localStorage values.
      window.location.reload();
    } catch (e) {
      setImportError("Invalid JSON or format.");
    }
  };

  const deleteItem = (key: string) => {
    localStorage.removeItem(key);
    setItems(getAllLocalStorage());
  };

  const cleanUpItems = () => {
    // Remove all todos localStorage items (e.g. todos1, todos2, etc.)
    let changed = false;
    for (let i = 1; i <= 20; i++) {
      if (localStorage.getItem(`todos${i}`) !== null) {
        localStorage.removeItem(`todos${i}`);
        changed = true;
      }
    }
    // Optionally, remove a base 'todos' key or other related keys.
    if (localStorage.getItem("todos") !== null) {
      localStorage.removeItem("todos");
      changed = true;
    }
    if (changed) window.location.reload();
  };

  return (
    <ShadowIn className="w-full" shadowColor="white">
      <div className="card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto">
        <main className="flex flex-col gap-6 w-full max-w-md">
          <h2 className="text-5xl title text-left my-2">save</h2>

          <div className="mb-4 grid grid-cols-3 gap-2 w-full">
            <div className="col-span-2 flex gap-2">
              <button
                className="btn px-3 py-1 rounded bg-foreground-muted font-bold mb-2"
                onClick={() => setShowExport((v) => !v)}
                type="button"
              >
                {showExport ? "hide export" : "export"}
              </button>
              <button
                className="btn px-3 py-1 rounded bg-foreground-muted font-bold mb-2"
                onClick={() => setShowImport((v) => !v)}
                type="button"
              >
                {showImport ? "hide import" : "import"}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                className="card btn px-3 py-1 rounded-lg font-bold mb-2"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to reset all todos localStorage items? This cannot be undone."
                    )
                  ) {
                    cleanUpItems();
                  }
                }}
                type="button"
              >
                RESET
              </button>
            </div>
          </div>
          {showExport && (
            <div className="flex flex-col gap-2 items-end w-full">
              <textarea
                className="w-full bg-foreground-muted p-2 rounded text-xs font-mono mb-2"
                rows={6}
                readOnly
                value={exportString}
                onFocus={(e) => e.target.select()}
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
                {copied ? "copied!" : "copy"}
              </button>
            </div>
          )}
          {showImport && (
            <div className="flex flex-col gap-2 mt-2 items-end w-full">
              <textarea
                className="w-full bg-foreground-muted p-2 rounded text-xs font-mono"
                rows={6}
                value={importString}
                onChange={(e) => setImportString(e.target.value)}
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
                  paste
                </button>
                <button
                  className="btn px-3 py-1 rounded-lg font-bold w-fit"
                  type="button"
                  onClick={handleImport}
                >
                  IMPORT
                </button>
              </div>
              {importError && (
                <span className="text-red-500 text-xs self-start">
                  {importError}
                </span>
              )}
            </div>
          )}
        </main>
      </div>
    </ShadowIn>
  );
}