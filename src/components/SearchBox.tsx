import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import type { Person } from "@/db/types";
import { cn } from "@/lib/utils";

/** Lowercase and strip Vietnamese diacritics so "nguyen" matches "Nguyễn". */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

function displayName(person: Person): string {
  return [person.last_name, person.middle_name, person.first_name]
    .filter(Boolean)
    .join(" ");
}

export function searchPersons(persons: readonly Person[], query: string): Person[] {
  const needle = normalizeForSearch(query);
  if (!needle) return [];
  return persons
    .filter((person) => normalizeForSearch(displayName(person)).includes(needle))
    .slice(0, 8);
}

export function SearchBox() {
  const { persons, selectPerson } = useTreeStore();
  const t = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchPersons(persons, query), [persons, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (person: Person) => {
    selectPerson(person.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  };

  const listboxId = "person-search-results";
  const showResults = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 border border-stone-200 bg-white rounded-full px-3 py-2 focus-within:border-stone-400 transition-colors">
        <Search className="size-4 text-stone-400 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t.search.label}
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-activedescendant={
            showResults && results[activeIndex]
              ? `search-option-${results[activeIndex].id}`
              : undefined
          }
          aria-autocomplete="list"
          placeholder={t.search.placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-28 sm:w-44 bg-transparent text-sm text-stone-700 placeholder:text-stone-400 outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label={t.search.clear}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {showResults && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t.search.label}
          className="absolute top-full right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white border border-stone-200 rounded-2xl shadow-lg z-50 py-1.5"
        >
          {results.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-stone-400" role="presentation">
              {t.search.noResults}
            </li>
          ) : (
            results.map((person, index) => (
              <li
                key={person.id}
                id={`search-option-${person.id}`}
                role="option"
                aria-selected={index === activeIndex}
                onPointerDown={(event) => {
                  event.preventDefault();
                  choose(person);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between gap-2",
                  index === activeIndex
                    ? "bg-stone-100 text-stone-900"
                    : "text-stone-700",
                )}
              >
                <span className="truncate font-medium">{displayName(person)}</span>
                {person.birth_year && (
                  <span className="text-xs text-stone-400 shrink-0">
                    {person.birth_year}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
