'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  X,
  Building2,
  User,
  Layers,
  Target,
  Filter,
  Plus,
  Trash2,
} from 'lucide-react';

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | string[] | number[];
}

interface FilterGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  conditions: FilterCondition[];
}

const AVAILABLE_FILTERS = [
  { field: 'company.name', label: 'Company Name', type: 'text', group: 'company' },
  { field: 'company.industry', label: 'Industry', type: 'select', group: 'company' },
  { field: 'company.employeeCount', label: 'Employee Count', type: 'range', group: 'company' },
  { field: 'company.revenue', label: 'Annual Revenue', type: 'range', group: 'company' },
  { field: 'company.fundingStage', label: 'Funding Stage', type: 'select', group: 'company' },
  { field: 'contact.firstName', label: 'First Name', type: 'text', group: 'contact' },
  { field: 'contact.lastName', label: 'Last Name', type: 'text', group: 'contact' },
  { field: 'contact.email', label: 'Email', type: 'text', group: 'contact' },
  { field: 'contact.title', label: 'Job Title', type: 'text', group: 'contact' },
  { field: 'contact.seniority', label: 'Seniority', type: 'select', group: 'contact' },
  { field: 'contact.department', label: 'Department', type: 'select', group: 'contact' },
  { field: 'technologies.name', label: 'Technology', type: 'text', group: 'technology' },
  { field: 'technologies.category', label: 'Tech Category', type: 'select', group: 'technology' },
  { field: 'intent.score', label: 'Intent Score', type: 'range', group: 'intent' },
  { field: 'intent.buyingStage', label: 'Buying Stage', type: 'select', group: 'intent' },
  { field: 'location.city', label: 'City', type: 'text', group: 'location' },
  { field: 'location.state', label: 'State', type: 'text', group: 'location' },
  { field: 'location.country', label: 'Country', type: 'select', group: 'location' },
];

const OPERATORS: Record<string, string[]> = {
  text: ['equals', 'contains', 'starts_with', 'ends_with', 'is_empty'],
  select: ['equals', 'not_equals', 'in', 'not_in'],
  range: ['equals', 'greater_than', 'less_than', 'between'],
};

interface FilterBuilderProps {
  onFiltersChange: (filters: FilterGroup[]) => void;
  className?: string;
}

function SortableFilterItem({
  condition,
  onRemove,
  onUpdate,
}: {
  condition: FilterCondition;
  onRemove: () => void;
  onUpdate: (updates: Partial<FilterCondition>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: condition.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const filter = AVAILABLE_FILTERS.find((f) => f.field === condition.field);
  const operators = filter ? OPERATORS[filter.type] || [] : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 bg-muted rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-1 hover:bg-background rounded cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Select
            value={condition.field}
            onValueChange={(value) => onUpdate({ field: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FILTERS.map((f) => (
                <SelectItem key={f.field} value={f.field}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(value) => onUpdate({ operator: value })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op} value={op}>
                  {op.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Value Input based on filter type */}
        {filter?.type === 'text' && (
          <Input
            value={condition.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Enter value..."
          />
        )}

        {filter?.type === 'range' && (
          <div className="space-y-2">
            <Slider
              value={[
                Number((Array.isArray(condition.value) ? condition.value[0] : 0) || 0),
                Number((Array.isArray(condition.value) ? condition.value[1] : 100) || 100),
              ]}
              max={100}
              step={1}
              onValueChange={(value: number[]) => onUpdate({ value })}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Array.isArray(condition.value) ? condition.value[0] : 0}</span>
              <span>{Array.isArray(condition.value) ? condition.value[1] : 100}</span>
            </div>
          </div>
        )}

        {filter?.type === 'select' && (
          <Input
            value={condition.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Enter values (comma-separated)..."
          />
        )}
      </div>
    </div>
  );
}

export function FilterBuilder({ onFiltersChange, className }: FilterBuilderProps) {
  const [groups, setGroups] = useState<FilterGroup[]>([
    {
      id: 'company',
      name: 'Company',
      icon: <Building2 className="h-4 w-4" />,
      conditions: [],
    },
    {
      id: 'contact',
      name: 'Contact',
      icon: <User className="h-4 w-4" />,
      conditions: [],
    },
    {
      id: 'technology',
      name: 'Technology',
      icon: <Layers className="h-4 w-4" />,
      conditions: [],
    },
    {
      id: 'intent',
      name: 'Intent',
      icon: <Target className="h-4 w-4" />,
      conditions: [],
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addCondition = (groupId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                {
                  id: `${groupId}-${Date.now()}`,
                  field: AVAILABLE_FILTERS[0]?.field || 'name',
                  operator: 'equals',
                  value: '',
                },
              ],
            }
          : group
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.filter((c) => c.id !== conditionId),
            }
          : group
      )
    );
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map((c) =>
                c.id === conditionId ? { ...c, ...updates } : c
              ),
            }
          : group
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent, groupId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;

          const oldIndex = group.conditions.findIndex((c) => c.id === active.id);
          const newIndex = group.conditions.findIndex((c) => c.id === over.id);

          return {
            ...group,
            conditions: arrayMove(group.conditions, oldIndex, newIndex),
          };
        })
      );
    }
  };

  const clearAllFilters = () => {
    setGroups((prev) => prev.map((group) => ({ ...group, conditions: [] })));
  };

  const totalFilters = groups.reduce(
    (sum, group) => sum + group.conditions.length,
    0
  );

  React.useEffect(() => {
    onFiltersChange(groups);
  }, [groups, onFiltersChange]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Filter Builder</CardTitle>
            {totalFilters > 0 && (
              <Badge variant="secondary">{totalFilters} active</Badge>
            )}
          </div>
          {totalFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Accordion type="multiple" defaultValue={['company', 'contact']}>
          {groups.map((group) => (
            <AccordionItem key={group.id} value={group.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  {group.icon}
                  <span>{group.name}</span>
                  {group.conditions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {group.conditions.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, group.id)}
                  >
                    <SortableContext
                      items={group.conditions.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.conditions.map((condition) => (
                        <SortableFilterItem
                          key={condition.id}
                          condition={condition}
                          onRemove={() => removeCondition(group.id, condition.id)}
                          onUpdate={(updates) =>
                            updateCondition(group.id, condition.id, updates)
                          }
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => addCondition(group.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add {group.name} Filter
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
