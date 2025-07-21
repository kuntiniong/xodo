"use client";

import React, { useState } from "react";

export type Command = {
  type: "cd" | "add" | "touch" | "rm" | "rm-done" | "clear" | "invalid";
  args?: any;
  error?: string;
};

interface SearchBarProps {
  onSearch: (command: Command) => void;
}

// List flag mapping for cd/add/rm commands
const LIST_FLAG_MAP: Record<string, string> = {
  work: "work",
  w: "work",
  main: "main",
  m: "main",
  admin: "admin",
  a: "admin",
  study: "study",
  s: "study",
  project: "project",
  p: "project",
  hobby: "hobby",
  h: "hobby",
  // Add more mappings as needed
};

function parseCommand(input: string): Command {
  const trimmed = input.trim();
  if (!trimmed) return { type: "invalid", error: "Empty command" };

  // cd <list-id> or cd --<list-name> or cd -<list-initial>
  const cdFlagMatch = /^cd\s+(--([\w-]+)|-([\w])|([\w-]+))$/i.exec(trimmed);
  if (cdFlagMatch) {
    let listId = cdFlagMatch[4];
    if (cdFlagMatch[2]) listId = LIST_FLAG_MAP[cdFlagMatch[2].toLowerCase()];
    if (cdFlagMatch[3]) listId = LIST_FLAG_MAP[cdFlagMatch[3].toLowerCase()];
    return {
      type: "cd",
      args: {
        listName: cdFlagMatch[2] || undefined,
        listInitial: cdFlagMatch[3] || undefined,
        listId: listId || undefined,
      },
    };
  }

  // add/touch "<task-name>" --<list-name> or -<list-initial>
  const addMatch = /^(add|touch)\s+"([^"]+)"\s+(--(\w+)|-(\w))$/i.exec(trimmed);
  if (addMatch) {
    return {
      type: addMatch[1] === "add" ? "add" : "touch",
      args: {
        taskName: addMatch[2],
        listName: addMatch[4] || undefined,
        listInitial: addMatch[5] || undefined,
      },
    };
  }

  // rm <task-id> --<list-name> or -<list-initial>
  const rmMatch = /^rm\s+(\d+)\s+(--(\w+)|-(\w))$/i.exec(trimmed);
  if (rmMatch) {
    return {
      type: "rm",
      args: {
        taskId: Number(rmMatch[1]),
        listName: rmMatch[3] || undefined,
        listInitial: rmMatch[4] || undefined,
      },
    };
  }

  // rm <task-id> --done --<list-name> or -d -<list-initial>
  const rmDoneMatch = /^rm\s+(\d+)\s+(--done|-d)\s+(--(\w+)|-(\w))$/i.exec(trimmed);
  if (rmDoneMatch) {
    return {
      type: "rm-done",
      args: {
        taskId: Number(rmDoneMatch[1]),
        listName: rmDoneMatch[5] || undefined,
        listInitial: rmDoneMatch[6] || undefined,
      },
    };
  }

  // clear: scroll back to top
  if (/^clear$/i.test(trimmed)) {
    return { type: "clear" };
  }

  return { type: "invalid", error: "Unknown or invalid command" };
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Check for Ctrl+K or Command+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    // Listen for the clear command to scroll to top
    const handleClear = (cmd: any) => {
      if (cmd?.type === "clear") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("todo-command", (e: any) => handleClear(e.detail));
    return () => window.removeEventListener("todo-command", (e: any) => handleClear(e.detail));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = parseCommand(query);
    onSearch(command);
    setQuery(""); // Clear the search bar after submit
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Press Ctrl+K or Cmd+K or check out the commands at the footer..."
        className="bg-background/80 font-mono flex-1 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-link-hover/40 transition-all duration-250"
        aria-label="Search tasks or lists"
      />
      {/* Removed the Search button */}
    </form>
  );
};

export default SearchBar;