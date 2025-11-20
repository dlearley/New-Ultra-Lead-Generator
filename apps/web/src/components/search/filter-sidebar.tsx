"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import * as Label from "@radix-ui/react-label";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import { CheckIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResponsiveFilter } from "@prospecting-platform/ui";
import type { ProspectFilters } from "@/types/prospect";
import { createDefaultFilters } from "@/lib/mock-data";
import {
  INDUSTRIES,
  OWNERSHIP_TYPES,
  BUSINESS_TYPES,
  REVENUE_BANDS,
  EMPLOYEE_BANDS,
  REVIEW_PLATFORMS,
  TECH_STACK_TAGS,
  CITY_LIBRARY,
} from "@/data/reference-data";

interface FilterSidebarProps {
  filters: ProspectFilters;
  onFiltersChange: (filters: ProspectFilters) => void;
  isMobile?: boolean;
}

export function FilterSidebar({ filters, onFiltersChange, isMobile = false }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(!isMobile);

  const updateFilter = <K extends keyof ProspectFilters>(
    key: K,
    value: ProspectFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayValue = <T,>(array: T[] = [], value: T): T[] => {
    return array.includes(value)
      ? array.filter((item) => item !== value)
      : [...array, value];
  };

  const renderIndustryFilters = () => (
    <div className="space-y-2">
      {INDUSTRIES.map((industry) => (
        <label key={industry.value} className="flex items-start gap-2">
          <Checkbox.Root
            checked={filters.industries.includes(industry.value)}
            onCheckedChange={() =>
              updateFilter(
                "industries",
                toggleArrayValue(filters.industries, industry.value)
              )
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${industry.label} industry`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="flex-1">
            <div className="text-sm">{industry.label}</div>
            <div className="text-xs text-zinc-500">
              NAICS: {industry.naics} | SIC: {industry.sic}
            </div>
          </div>
        </label>
      ))}
    </div>
  );

  const renderOwnershipFilters = () => (
    <div className="space-y-2">
      {OWNERSHIP_TYPES.map((type) => (
        <label key={type} className="flex items-center gap-2">
          <Checkbox.Root
            checked={filters.ownershipTypes.includes(type)}
            onCheckedChange={() =>
              updateFilter(
                "ownershipTypes",
                toggleArrayValue(filters.ownershipTypes, type)
              )
            }
            className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${type} ownership type`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="text-sm">{type}</div>
        </label>
      ))}
    </div>
  );

  const renderBusinessTypeFilters = () => (
    <div className="space-y-2">
      {BUSINESS_TYPES.map((type) => (
        <label key={type} className="flex items-center gap-2">
          <Checkbox.Root
            checked={filters.businessTypes.includes(type)}
            onCheckedChange={() =>
              updateFilter(
                "businessTypes",
                toggleArrayValue(filters.businessTypes, type)
              )
            }
            className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${type} business type`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="text-sm">{type}</div>
        </label>
      ))}
    </div>
  );

  const renderRevenueFilters = () => (
    <div className="space-y-2">
      {REVENUE_BANDS.map((band) => (
        <label key={band.value} className="flex items-center gap-2">
          <Checkbox.Root
            checked={filters.revenueBands.includes(band.value)}
            onCheckedChange={() =>
              updateFilter(
                "revenueBands",
                toggleArrayValue(filters.revenueBands, band.value)
              )
            }
            className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${band.label} revenue range`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="text-sm">{band.label}</div>
        </label>
      ))}
    </div>
  );

  const renderEmployeeFilters = () => (
    <div className="space-y-2">
      {EMPLOYEE_BANDS.map((band) => (
        <label key={band.value} className="flex items-center gap-2">
          <Checkbox.Root
            checked={filters.employeeBands.includes(band.value)}
            onCheckedChange={() =>
              updateFilter(
                "employeeBands",
                toggleArrayValue(filters.employeeBands, band.value)
              )
            }
            className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${band.label} employee range`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="text-sm">{band.label}</div>
        </label>
      ))}
    </div>
  );

  const renderLocationFilters = () => (
    <div className="space-y-2">
      {CITY_LIBRARY.slice(0, 10).map((city) => (
        <label key={city.value} className="flex items-center gap-2">
          <Checkbox.Root
            checked={filters.locations.includes(city.value)}
            onCheckedChange={() =>
              updateFilter(
                "locations",
                toggleArrayValue(filters.locations, city.value)
              )
            }
            className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${city.label} location`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="text-sm">{city.label}</div>
        </label>
      ))}
    </div>
  );

  const renderTechStackFilters = () => (
    <div className="flex flex-wrap gap-2">
      {TECH_STACK_TAGS.slice(0, 12).map((tech) => {
        const isSelected = filters.techStacks.includes(tech);
        return (
          <button
            key={tech}
            onClick={() =>
              updateFilter(
                "techStacks",
                toggleArrayValue(filters.techStacks, tech)
              )
            }
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              isSelected
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
            aria-label={`Toggle ${tech} technology`}
            aria-pressed={isSelected}
          >
            {tech}
          </button>
        );
      })}
    </div>
  );

  const renderReviewFilters = () => (
    <div className="space-y-2">
      {REVIEW_PLATFORMS.map((platform) => (
        <label key={platform} className="flex items-center gap-2">
          <Checkbox.Root
            checked={filters.reviewPlatforms.includes(platform)}
            onCheckedChange={() =>
              updateFilter(
                "reviewPlatforms",
                toggleArrayValue(filters.reviewPlatforms, platform)
              )
            }
            className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
            aria-label={`Select ${platform} review platform`}
          >
            <Checkbox.Indicator className="flex items-center justify-center">
              <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <div className="text-sm">{platform}</div>
        </label>
      ))}
    </div>
  );

  const renderAIScoreRange = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label.Root className="text-sm font-medium">AI Lead Score Range</Label.Root>
        <span className="text-sm text-zinc-500">
          {filters.aiScoreRange[0]} - {filters.aiScoreRange[1]}
        </span>
      </div>
      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={filters.aiScoreRange}
        onValueChange={(value) => updateFilter("aiScoreRange", value as [number, number])}
        max={100}
        min={0}
        step={1}
        aria-label="AI lead score range"
      >
        <Slider.Track className="relative h-1 w-full grow rounded-full bg-zinc-200 dark:bg-zinc-700">
          <Slider.Range className="absolute h-full rounded-full bg-zinc-900 dark:bg-zinc-100" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-4 w-4 rounded-full bg-zinc-900 shadow-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-100 dark:hover:bg-zinc-300"
          aria-label="Minimum AI score"
        />
        <Slider.Thumb
          className="block h-4 w-4 rounded-full bg-zinc-900 shadow-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-100 dark:hover:bg-zinc-300"
          aria-label="Maximum AI score"
        />
      </Slider.Root>
    </div>
  );

  const renderVerifiedOnly = () => (
    <div className="flex items-center space-x-2">
      <Switch.Root
        checked={filters.verifiedOnly}
        onCheckedChange={(checked) => updateFilter("verifiedOnly", checked)}
        className="h-4 w-7 rounded-full border-2 border-zinc-300 bg-white data-[state=checked]:bg-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:data-[state=checked]:bg-zinc-100"
        aria-label="Show verified businesses only"
      >
        <Switch.Thumb className="block h-3 w-3 translate-x-0.5 rounded-full bg-zinc-500 shadow-sm transition-transform data-[state=checked]:translate-x-3 dark:bg-zinc-300" />
      </Switch.Root>
      <Label.Root className="text-sm">Verified businesses only</Label.Root>
    </div>
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed left-4 top-20 z-10 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle filters"
      >
        <Filter className="h-4 w-4" />
        Filters
      </Button>

      <aside
        className={`
          fixed left-0 top-0 z-40 h-full w-80 overflow-y-auto border-r border-zinc-200 bg-white p-6 transition-transform dark:border-zinc-800 dark:bg-zinc-900
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
        role="complementary"
        aria-label="Search filters"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange(createDefaultFilters())}
              aria-label="Clear all filters"
            >
              Clear all
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(false)}
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {isMobile ? (
            <>
              <ResponsiveFilter title="Industry" defaultOpen={false}>
                {renderIndustryFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Ownership Type" defaultOpen={false}>
                {renderOwnershipFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Business Type" defaultOpen={false}>
                {renderBusinessTypeFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Revenue Range" defaultOpen={false}>
                {renderRevenueFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Employee Count" defaultOpen={false}>
                {renderEmployeeFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Locations" defaultOpen={false}>
                {renderLocationFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Technology Stack" defaultOpen={false}>
                {renderTechStackFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="Review Platforms" defaultOpen={false}>
                {renderReviewFilters()}
              </ResponsiveFilter>
              
              <ResponsiveFilter title="AI Scoring" defaultOpen={true}>
                <div className="space-y-4">
                  {renderAIScoreRange()}
                  {renderVerifiedOnly()}
                </div>
              </ResponsiveFilter>
            </>
          ) : (
            <>
              <div>
                <Label.Root className="mb-3 text-sm font-medium">Industry</Label.Root>
                {renderIndustryFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Ownership Type</Label.Root>
                {renderOwnershipFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Business Type</Label.Root>
                {renderBusinessTypeFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Revenue Range</Label.Root>
                {renderRevenueFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Employee Count</Label.Root>
                {renderEmployeeFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Locations</Label.Root>
                {renderLocationFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Technology Stack</Label.Root>
                {renderTechStackFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">Review Platforms</Label.Root>
                {renderReviewFilters()}
              </div>

              <div>
                <Label.Root className="mb-3 text-sm font-medium">AI Scoring</Label.Root>
                <div className="space-y-4">
                  {renderAIScoreRange()}
                  {renderVerifiedOnly()}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}