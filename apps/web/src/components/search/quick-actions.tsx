"use client";

import { useState } from "react";
import { BookmarkPlus, ListPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const LIST_OPTIONS = [
  { id: "priority", name: "Priority Targets" },
  { id: "abm", name: "ABM Pilot" },
  { id: "follow-up", name: "Follow Up" },
];

interface QuickActionsProps {
  onSaveSearch: (name: string) => Promise<void>;
  onAddToList: (listId: string) => Promise<void>;
}

export function QuickActions({ onSaveSearch, onAddToList }: QuickActionsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saveName, setSaveName] = useState("Smart Prospecting Search");
  const [selectedList, setSelectedList] = useState(LIST_OPTIONS[0].id);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await onSaveSearch(saveName);
      setMessage("Search saved successfully");
    } catch (error) {
      setMessage("Unable to save search");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToList = async () => {
    setIsAdding(true);
    setMessage(null);
    try {
      await onAddToList(selectedList);
      setMessage("Prospects added to list");
    } catch (error) {
      setMessage("Unable to add to list");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            <>
              <BookmarkPlus className="mr-2 h-4 w-4" /> Save search
            </>
          )}
        </Button>
        <Input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="w-full max-w-xs"
          aria-label="Search name"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={handleAddToList} disabled={isAdding}>
          {isAdding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding
            </>
          ) : (
            <>
              <ListPlus className="mr-2 h-4 w-4" /> Add to list
            </>
          )}
        </Button>
        <select
          className="h-10 rounded-md border border-zinc-200 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={selectedList}
          onChange={(e) => setSelectedList(e.target.value)}
        >
          {LIST_OPTIONS.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {message && <p className="text-sm text-zinc-500">{message}</p>}
    </Card>
  );
}
