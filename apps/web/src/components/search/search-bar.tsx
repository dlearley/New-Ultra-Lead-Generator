"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  defaultValue?: string;
}

export function SearchBar({ onSearch, isLoading, defaultValue = "" }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            data-testid="smart-search-input"
            placeholder='Try: "B2B SaaS companies in San Francisco with 50+ employees hiring"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "h-14 pl-12 pr-12 text-base shadow-lg",
              isLoading && "opacity-50"
            )}
            disabled={isLoading}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-14 px-8"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        AI-powered search understands natural language queries
      </p>
    </form>
  );
}
