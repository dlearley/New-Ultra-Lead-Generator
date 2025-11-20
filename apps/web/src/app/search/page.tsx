"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, Map, Brain, MessageSquare } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { FilterSidebar } from "@/components/search/filter-sidebar";
import { ResultsTable } from "@/components/search/results-table";
import { ProspectMap } from "@/components/search/prospect-map";
import { Pagination } from "@/components/search/pagination";
import { QuickActions } from "@/components/search/quick-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AISummaryModal } from "@prospecting-platform/ui";
import { AIOutreachModal } from "@prospecting-platform/ui";
import { useToast } from "@prospecting-platform/ui";
import { ResponsiveContainer, ResponsiveFlex } from "@prospecting-platform/ui";
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
  const { toast } = useToast();
  const [filters, setFilters] = useState<ProspectFilters>(createDefaultFilters());
  const [searchQuery, setSearchQuery] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [isMobile, setIsMobile] = useState(false);
  
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectProspect = (prospectId: string) => {
    setSelectedProspectId(prospectId);
    setSelectedProspectIds(prev => 
      prev.includes(prospectId) 
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProspectIds.length === prospects.length) {
      setSelectedProspectIds([]);
    } else {
      setSelectedProspectIds(prospects.map(p => p.id));
    }
  };

  const handleAISummaryGenerated = (summary: string) => {
    toast({
      title: "Summary Generated",
      description: "AI summary has been successfully generated.",
      variant: "success",
    });
  };

  const handleAIOutreachGenerated = (content: string, type: 'email' | 'linkedin') => {
    toast({
      title: "Outreach Generated",
      description: `Personalized ${type} message has been created.`,
      variant: "success",
    });
  };

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
    try {
      await saveSearch(name, filters);
      toast({
        title: "Search Saved",
        description: `Search "${name}" has been saved successfully.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddToList = async (listId: string) => {
    try {
      const prospectIds = prospects.map((p) => p.id);
      await addToList(listId, prospectIds);
      toast({
        title: "Added to List",
        description: `Prospects have been added to the list.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Add Failed",
        description: "Unable to add prospects to list. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      
      <ResponsiveFlex direction={{ default: "col", md: "row" }} className="min-h-screen">
        <FilterSidebar 
          filters={filters} 
          onFiltersChange={handleFiltersChange} 
          isMobile={isMobile}
        />

        <main id="main-content" className="flex-1 bg-zinc-50 dark:bg-black">
          <ResponsiveContainer maxWidth="full" padding={{ default: "sm", md: "lg" }}>
            <div className="mb-6 md:mb-8">
              <h1 className="mb-2 text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Find Your Next Customers
              </h1>
              <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
                AI-powered search to discover high-potential prospects
              </p>
            </div>

            <div className="mb-6 md:mb-8">
              <SearchBar
                onSearch={handleSearch}
                isLoading={isSearching || isParsing}
                defaultValue={searchQuery}
              />
            </div>

            {!isInitialLoad && (
              <>
                <div className="mb-6">
                  <ResponsiveFlex 
                    direction={{ default: "col", sm: "row" }} 
                    justify="between" 
                    align="center"
                    gap="md"
                  >
                    <QuickActions 
                      onSaveSearch={handleSaveSearch} 
                      onAddToList={handleAddToList} 
                    />
                    
                    <div className="flex items-center gap-2">
                      <AISummaryModal
                        prospectIds={selectedProspectIds.length > 0 ? selectedProspectIds : prospects.map(p => p.id)}
                        onSummaryGenerated={handleAISummaryGenerated}
                        trigger={
                          <button
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={prospects.length === 0}
                            aria-label="Generate AI summary"
                          >
                            <Brain className="h-4 w-4" />
                            <span className="hidden sm:inline">AI Summary</span>
                            <span className="sm:hidden">Summary</span>
                          </button>
                        }
                      />
                      
                      <AIOutreachModal
                        prospectIds={selectedProspectIds.length > 0 ? selectedProspectIds : prospects.map(p => p.id)}
                        onOutreachGenerated={handleAIOutreachGenerated}
                        trigger={
                          <button
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={prospects.length === 0}
                            aria-label="Generate AI outreach"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">AI Outreach</span>
                            <span className="sm:hidden">Outreach</span>
                          </button>
                        }
                      />
                    </div>
                  </ResponsiveFlex>
                </div>

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "map")}>
                  <div className="mb-6">
                    <ResponsiveFlex 
                      direction={{ default: "col", sm: "row" }} 
                      justify="between" 
                      align="center"
                      gap="sm"
                    >
                      <div className="text-base md:text-lg font-medium text-zinc-900 dark:text-zinc-50">
                        {total} results found
                        {selectedProspectIds.length > 0 && (
                          <span className="ml-2 text-sm text-zinc-500">
                            ({selectedProspectIds.length} selected)
                          </span>
                        )}
                      </div>
                      <TabsList>
                        <TabsTrigger value="table" className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          <span className="hidden sm:inline">Table</span>
                          <span className="sm:hidden">List</span>
                        </TabsTrigger>
                        <TabsTrigger value="map" className="flex items-center gap-2">
                          <Map className="h-4 w-4" />
                          <span className="hidden sm:inline">Map</span>
                          <span className="sm:hidden">Map</span>
                        </TabsTrigger>
                      </TabsList>
                    </ResponsiveFlex>
                  </div>

                  <TabsContent value="table">
                    <ResultsTable
                      prospects={prospects}
                      isLoading={isSearching}
                      selectedId={selectedProspectId || undefined}
                      selectedIds={selectedProspectIds}
                      onSelectProspect={handleSelectProspect}
                      onSelectAll={handleSelectAll}
                      sortState={sortState}
                      onSortChange={handleSortChange}
                    />
                  </TabsContent>

                  <TabsContent value="map">
                    <ProspectMap
                      prospects={prospects}
                      selectedId={selectedProspectId}
                      selectedIds={selectedProspectIds}
                      onSelectProspect={handleSelectProspect}
                    />
                  </TabsContent>
                </Tabs>

                {total > 0 && (
                  <div className="mt-6 md:mt-8">
                    <Pagination
                      pagination={pagination}
                      total={total}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </ResponsiveContainer>
        </main>
      </ResponsiveFlex>
    </>
  );
}
