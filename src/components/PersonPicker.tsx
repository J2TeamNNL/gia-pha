"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchPersons } from "./SearchBox";
import { displayName } from "@/lib/personName";
import type { Person } from "@/db/types";

interface PersonPickerProps {
  persons: readonly Person[];
  exclude?: ReadonlySet<string>;
  placeholder: string;
  noResults: string;
  onPick: (person: Person) => void;
}

export function PersonPicker({
  persons,
  exclude,
  placeholder,
  noResults,
  onPick,
}: PersonPickerProps) {
  const [query, setQuery] = useState("");
  const matches = query.trim()
    ? searchPersons(persons, query).filter(
        (person) => !exclude?.has(person.id),
      )
    : [];

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {query.trim() && (
        <ul className="max-h-44 overflow-y-auto rounded-lg border border-stone-200 bg-white text-sm">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-stone-500">{noResults}</li>
          ) : (
            matches.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(person);
                    setQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-stone-50"
                >
                  {displayName(person)}
                  {person.birth_year && (
                    <span className="ml-2 text-xs text-stone-400">
                      {person.birth_year}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
