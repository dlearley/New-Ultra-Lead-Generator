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
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed left-4 top-20 z-10 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
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
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange(createDefaultFilters())}
          >
            Clear all
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-8">
          <div>
            <Label.Root className="mb-3 text-sm font-medium">Industry</Label.Root>
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
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Ownership Type</Label.Root>
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
                  >
                    <Checkbox.Indicator className="flex items-center justify-center">
                      <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <div className="text-sm">{type}</div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Business Type</Label.Root>
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
                  >
                    <Checkbox.Indicator className="flex items-center justify-center">
                      <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <div className="text-sm">{type}</div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Location</Label.Root>
            <div className="space-y-2">
              {CITY_LIBRARY.slice(0, 6).map((city) => {
                const isSelected = filters.locations?.some(
                  (loc) => loc.city === city.city && loc.state === city.state
                );
                return (
                  <label key={city.label} className="flex items-center gap-2">
                    <Checkbox.Root
                      checked={isSelected}
                      onCheckedChange={() => {
                        const currentLocations = filters.locations;
                        const newLocations = isSelected
                          ? currentLocations.filter(
                              (loc) =>
                                !(loc.city === city.city && loc.state === city.state)
                            )
                          : [
                              ...currentLocations,
                              {
                                city: city.city,
                                state: city.state,
                                country: city.country,
                                lat: city.lat,
                                lng: city.lng,
                              },
                            ];
                        updateFilter("locations", newLocations);
                      }}
                      className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
                    >
                      <Checkbox.Indicator className="flex items-center justify-center">
                        <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <div className="text-sm">{city.label}</div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">
              Radius: {filters.radiusMiles} miles
            </Label.Root>
            <Slider.Root
              className="relative flex h-5 w-full touch-none select-none items-center"
              value={[filters.radiusMiles]}
              onValueChange={([value]) => updateFilter("radiusMiles", value)}
              max={500}
              step={10}
            >
              <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <Slider.Range className="absolute h-full bg-zinc-900 dark:bg-zinc-50" />
              </Slider.Track>
              <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-zinc-900 bg-white ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-50 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300" />
            </Slider.Root>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Revenue Range</Label.Root>
            <div className="space-y-2">
              {REVENUE_BANDS.map((band) => {
                const isSelected =
                  filters.revenueRange?.[0] === band.range[0] &&
                  filters.revenueRange?.[1] === band.range[1];
                return (
                  <label key={band.label} className="flex items-center gap-2">
                    <Checkbox.Root
                      checked={isSelected}
                      onCheckedChange={() =>
                        updateFilter(
                          "revenueRange",
                          isSelected ? null : (band.range as [number, number])
                        )
                      }
                      className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
                    >
                      <Checkbox.Indicator className="flex items-center justify-center">
                        <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <div className="text-sm">{band.label}</div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Employee Count</Label.Root>
            <div className="space-y-2">
              {EMPLOYEE_BANDS.map((band) => {
                const isSelected =
                  filters.employeesRange?.[0] === band.range[0] &&
                  filters.employeesRange?.[1] === band.range[1];
                return (
                  <label key={band.label} className="flex items-center gap-2">
                    <Checkbox.Root
                      checked={isSelected}
                      onCheckedChange={() =>
                        updateFilter(
                          "employeesRange",
                          isSelected ? null : (band.range as [number, number])
                        )
                      }
                      className="h-4 w-4 shrink-0 rounded border border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:border-zinc-700 dark:data-[state=checked]:bg-zinc-50"
                    >
                      <Checkbox.Indicator className="flex items-center justify-center">
                        <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <div className="text-sm">{band.label}</div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Review Platforms</Label.Root>
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
                  >
                    <Checkbox.Indicator className="flex items-center justify-center">
                      <CheckIcon className="h-3 w-3 text-white dark:text-zinc-900" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <div className="text-sm">{platform}</div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Flags</Label.Root>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm">Currently Hiring</span>
                <Switch.Root
                  checked={filters.isHiring === true}
                  onCheckedChange={(checked) => updateFilter("isHiring", checked || null)}
                  className="relative h-6 w-11 rounded-full bg-zinc-200 data-[state=checked]:bg-zinc-900 dark:bg-zinc-800 dark:data-[state=checked]:bg-zinc-50"
                >
                  <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px] dark:bg-zinc-900" />
                </Switch.Root>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Has Website</span>
                <Switch.Root
                  checked={filters.hasWebsite === true}
                  onCheckedChange={(checked) => updateFilter("hasWebsite", checked || null)}
                  className="relative h-6 w-11 rounded-full bg-zinc-200 data-[state=checked]:bg-zinc-900 dark:bg-zinc-800 dark:data-[state=checked]:bg-zinc-50"
                >
                  <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px] dark:bg-zinc-900" />
                </Switch.Root>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Exclude Generic Emails</span>
                <Switch.Root
                  checked={filters.hasGenericEmail === false}
                  onCheckedChange={(checked) =>
                    updateFilter("hasGenericEmail", !checked)
                  }
                  className="relative h-6 w-11 rounded-full bg-zinc-200 data-[state=checked]:bg-zinc-900 dark:bg-zinc-800 dark:data-[state=checked]:bg-zinc-50"
                >
                  <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px] dark:bg-zinc-900" />
                </Switch.Root>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Recent Reviews</span>
                <Switch.Root
                  checked={filters.hasRecentReviews || false}
                  onCheckedChange={(checked) =>
                    updateFilter("hasRecentReviews", checked)
                  }
                  className="relative h-6 w-11 rounded-full bg-zinc-200 data-[state=checked]:bg-zinc-900 dark:bg-zinc-800 dark:data-[state=checked]:bg-zinc-50"
                >
                  <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px] dark:bg-zinc-900" />
                </Switch.Root>
              </label>
            </div>
          </div>

          <div>
            <Label.Root className="mb-3 text-sm font-medium">Tech Stack</Label.Root>
            <div className="flex flex-wrap gap-2">
              {TECH_STACK_TAGS.map((tech) => {
                const isSelected = filters.techStacks.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
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
                  >
                    {tech}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
