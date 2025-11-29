"use client";

import { ArrowUpDown, MoreVertical, Star, TrendingUp, Users, DollarSign, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Prospect, SortState } from "@/types/prospect";

interface ResultsTableProps {
  prospects: Prospect[];
  isLoading?: boolean;
  selectedId?: string;
  selectedIds?: string[];
  onSelectProspect: (id: string) => void;
  onSelectAll?: () => void;
  sortState: SortState;
  onSortChange: (field: SortState["field"]) => void;
}

export function ResultsTable({
  prospects,
  isLoading,
  selectedId,
  selectedIds = [],
  onSelectProspect,
  onSelectAll,
  sortState,
  onSortChange,
}: ResultsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          No results found
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  const formatRevenue = (range: [number, number]) => {
    const format = (num: number) => {
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
      return `$${num}`;
    };
    return `${format(range[0])} - ${format(range[1])}`;
  };

  const formatEmployees = (range: [number, number]) => {
    return `${range[0]} - ${range[1]}`;
  };

  const getLeadScoreBadge = (score: number) => {
    if (score >= 90) return { variant: "success" as const, label: "Hot Lead" };
    if (score >= 70) return { variant: "warning" as const, label: "Warm Lead" };
    return { variant: "secondary" as const, label: "Cold Lead" };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          {onSelectAll && (
            <button
              onClick={onSelectAll}
              className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-zinc-50"
              aria-label={selectedIds.length === prospects.length ? "Deselect all" : "Select all"}
            >
              {selectedIds.length === prospects.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {selectedIds.length === prospects.length ? "Deselect All" : "Select All"}
              </span>
            </button>
          )}
          <button
            onClick={() => onSortChange("aiLeadScore")}
            className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            AI Score
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => onSortChange("name")}
            className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
        {selectedIds.length > 0 && (
          <div className="text-sm text-zinc-500">
            {selectedIds.length} selected
          </div>
        )}
      </div>

      {prospects.map((prospect) => {
        const leadScore = getLeadScoreBadge(prospect.aiLeadScore);
        const isSelected = selectedId === prospect.id;
        const isMultiSelected = selectedIds.includes(prospect.id);

        return (
          <div
            key={prospect.id}
            onClick={() => onSelectProspect(prospect.id)}
            className={`
              cursor-pointer rounded-2xl border p-6 transition-all
              ${
                isSelected
                  ? "border-zinc-900 bg-zinc-50 shadow-lg dark:border-zinc-50 dark:bg-zinc-800"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {selectedIds.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProspect(prospect.id);
                    }}
                    className="mt-1 flex-shrink-0"
                    aria-label={isMultiSelected ? "Deselect prospect" : "Select prospect"}
                  >
                    {isMultiSelected ? (
                      <CheckSquare className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                    )}
                  </button>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {prospect.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {prospect.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant={leadScore.variant}>
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {leadScore.label} {prospect.aiLeadScore}
                      </Badge>
                      <Badge variant="secondary">{prospect.industry}</Badge>
                      <Badge variant="secondary">{prospect.ownership}</Badge>
                      <Badge variant="secondary">{prospect.businessType}</Badge>
                      {prospect.isHiring && (
                        <Badge variant="info">🔥 Hiring</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-zinc-400" />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {formatRevenue(prospect.revenueRange)}
                      </div>
                      <div className="text-xs text-zinc-500">Revenue</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-zinc-400" />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {formatEmployees(prospect.employeesRange)}
                      </div>
                      <div className="text-xs text-zinc-500">Employees</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-zinc-400" />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {prospect.reviewRating.toFixed(1)} ({prospect.reviewCount})
                      </div>
                      <div className="text-xs text-zinc-500">Reviews</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {prospect.location.city}, {prospect.location.state}
                      </div>
                      <div className="text-xs text-zinc-500">Location</div>
                    </div>
                  </div>
                </div>

                {prospect.techStack.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {prospect.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
