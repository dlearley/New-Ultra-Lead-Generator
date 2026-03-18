'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Sparkles, X, Building2, User, MapPin, Layers } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchSuggestion {
  type: 'company' | 'contact' | 'industry' | 'technology' | 'location';
  value: string;
  label: string;
  count?: number;
  metadata?: Record<string, unknown>;
}

interface NaturalLanguageSearchProps {
  onSearch: (query: string, parsedFilters?: Record<string, unknown>) => void;
  onNLQuery?: (query: string) => Promise<{
    parsedFilters: Record<string, unknown>;
    aiExplanation: string;
  }>;
  placeholder?: string;
  className?: string;
}

const EXAMPLE_QUERIES = [
  'SaaS companies in Detroit with 50-200 employees using HubSpot',
  'CEOs at Series B startups in healthcare',
  'Companies that visited pricing page in the last 7 days',
  'VPs of Sales at companies with 500+ employees',
  'Startups that raised funding in Q1 2024',
];

export function NaturalLanguageSearch({
  onSearch,
  onNLQuery,
  placeholder = 'Search contacts and companies...',
  className,
}: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [parsedFilters, setParsedFilters] = useState<Record<string, unknown> | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          `/api/advanced-search/suggestions?q=${encodeURIComponent(debouncedQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Parse natural language query
  const handleNLQuery = useCallback(async () => {
    if (!onNLQuery || !query.trim()) return;

    setIsLoading(true);
    try {
      const result = await onNLQuery(query);
      setParsedFilters(result.parsedFilters);
      setAiExplanation(result.aiExplanation);
      onSearch(query, result.parsedFilters);
    } catch (error) {
      console.error('NL query failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, onNLQuery, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, parsedFilters || undefined);
      setIsOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setParsedFilters(null);
    setAiExplanation(null);
    inputRef.current?.focus();
  };

  const applyExampleQuery = (example: string) => {
    setQuery(example);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'company':
        return <Building2 className="h-4 w-4" />;
      case 'contact':
        return <User className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'technology':
        return <Layers className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="pl-10 pr-20 h-12 text-lg"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {onNLQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleNLQuery}
                    disabled={isLoading || !query.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="w-[600px] p-0"
            align="start"
            sideOffset={4}
          >
            <Command className="rounded-lg">
              <CommandInput
                placeholder="Type to search..."
                value={query}
                onValueChange={setQuery}
                className="border-none"
              />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>
                  {query.length > 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-muted-foreground">No results found</p>
                      <Button
                        variant="link"
                        onClick={() => onSearch(query)}
                        className="mt-2"
                      >
                        Search for "{query}"
                      </Button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <p className="px-4 text-sm font-medium text-muted-foreground mb-2">
                        Try asking:
                      </p>
                      {EXAMPLE_QUERIES.map((example) => (
                        <button
                          key={example}
                          onClick={() => applyExampleQuery(example)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                            {example}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </CommandEmpty>

                {suggestions.length > 0 && (
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={`${suggestion.type}-${suggestion.value}`}
                        onSelect={() => {
                          setQuery(suggestion.label);
                          onSearch(suggestion.label);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-muted-foreground">
                            {getSuggestionIcon(suggestion.type)}
                          </span>
                          <span className="flex-1">{suggestion.label}</span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {suggestion.type}
                          </Badge>
                          {suggestion.count && (
                            <span className="text-xs text-muted-foreground">
                              {suggestion.count} results
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button type="submit" className="sr-only">Search</Button>
      </form>

      {/* AI Explanation */}
      {aiExplanation && (
        <div className="mt-2 p-3 bg-muted rounded-lg flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm">{aiExplanation}</p>
            {parsedFilters && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Filters applied:</span>
                {Object.entries(parsedFilters).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {JSON.stringify(value)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
