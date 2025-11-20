"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, Map } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { FilterSidebar } from "@/components/search/filter-sidebar";
import { ResultsTable } from "@/components/search/results-table";
import { ProspectMap } from "@/components/search/prospect-map";
import { Pagination } from "@/components/search/pagination";
import { QuickActions } from "@/components/search/quick-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ProspectFilters,
  Prospect,
  SortState,
  PaginationState,
} from "@/types/prospect";
import { 
  parseSearchQueryToFilters, 
  searchProspects, 
  saveSearch, 
  addToList,
  createDefaultFilters 
} from "@/lib/mock-data";
import { DEFAULT_PAGE_SIZE } from "@/data/reference-data";

export default function SearchPage() {
  const [filters, setFilters] = useState<ProspectFilters>(createDefaultFilters());
  const [searchQuery, setSearchQuery] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  
  const [sortState, setSortState] = useState<SortState>({
    field: "aiLeadScore",
    direction: "desc",
  });
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const performSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await searchProspects(
        filters,
        pagination.page,
        pagination.pageSize,
        sortState.field,
        sortState.direction
      );
      setProspects(results.results);
      setTotal(results.total);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [filters, pagination.page, pagination.pageSize, sortState]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsParsing(true);
    try {
      const parsedFilters = await parseSearchQueryToFilters(query);
      setFilters((prev) => ({
        ...prev,
        ...parsedFilters,
        industries: parsedFilters.industries ?? prev.industries,
        naicsCodes: parsedFilters.naicsCodes ?? prev.naicsCodes,
        sicCodes: parsedFilters.sicCodes ?? prev.sicCodes,
        businessTypes: parsedFilters.businessTypes ?? prev.businessTypes,
        ownershipTypes: parsedFilters.ownershipTypes ?? prev.ownershipTypes,
        locations: parsedFilters.locations ?? prev.locations,
        reviewPlatforms: parsedFilters.reviewPlatforms ?? prev.reviewPlatforms,
        techStacks: parsedFilters.techStacks ?? prev.techStacks,
        query,
      }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    } catch (error) {
      console.error("Query parsing failed:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFiltersChange = (newFilters: ProspectFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field: SortState["field"]) => {
    setSortState((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSaveSearch = async (name: string) => {
    await saveSearch(name, filters);
  };

  const handleAddToList = async (listId: string) => {
    const prospectIds = prospects.map((p) => p.id);
    await addToList(listId, prospectIds);
  };

  return (
    <div className="flex min-h-screen">
      <FilterSidebar filters={filters} onFiltersChange={handleFiltersChange} />

      <main className="flex-1 bg-zinc-50 p-8 dark:bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Find Your Next Customers
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              AI-powered search to discover high-potential prospects
            </p>
          </div>

          <div className="mb-8">
            <SearchBar
              onSearch={handleSearch}
              isLoading={isSearching || isParsing}
              defaultValue={searchQuery}
            />
          </div>

          {!isInitialLoad && (
            <>
              <div className="mb-6">
                <QuickActions onSaveSearch={handleSaveSearch} onAddToList={handleAddToList} />
              </div>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "map")}>
                <div className="mb-6 flex items-center justify-between">
                  <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {total} results found
                  </div>
                  <TabsList>
                    <TabsTrigger value="table">
                      <Table className="mr-2 h-4 w-4" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="map">
                      <Map className="mr-2 h-4 w-4" />
                      Map
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="table">
                  <ResultsTable
                    prospects={prospects}
                    isLoading={isSearching}
                    selectedId={selectedProspectId || undefined}
                    onSelectProspect={setSelectedProspectId}
                    sortState={sortState}
                    onSortChange={handleSortChange}
                  />
                </TabsContent>

                <TabsContent value="map">
                  <ProspectMap
                    prospects={prospects}
                    selectedId={selectedProspectId}
                    onSelectProspect={setSelectedProspectId}
                  />
                </TabsContent>
              </Tabs>

              {total > 0 && (
                <div className="mt-8">
                  <Pagination
                    pagination={pagination}
                    total={total}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
