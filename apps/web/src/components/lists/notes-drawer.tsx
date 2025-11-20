"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, MessageSquare, Plus, User, Clock } from "lucide-react";
import { LeadListEntry, LeadNote } from "@/types/lead-lists";

interface NotesDrawerProps {
  entry: LeadListEntry;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesDrawer({ entry, isOpen, onClose }: NotesDrawerProps) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock notes data - replace with actual API call
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const mockNotes: LeadNote[] = [
        {
          id: "note-1",
          entryId: entry.id,
          content: "Initial discovery call went well. They're interested in our enterprise solution but need to discuss budget with their finance team.",
          authorId: "user1",
          authorName: "Sarah Chen",
          createdAt: "2024-11-18T10:30:00Z",
          updatedAt: "2024-11-18T10:30:00Z",
          isInternal: false
        },
        {
          id: "note-2",
          entryId: entry.id,
          content: "Follow-up scheduled for next Tuesday. Prepare demo focused on their specific use case in healthcare compliance.",
          authorId: "user2",
          authorName: "Mike Johnson",
          createdAt: "2024-11-19T14:15:00Z",
          updatedAt: "2024-11-19T14:15:00Z",
          isInternal: true
        }
      ];

      setTimeout(() => {
        setNotes(mockNotes);
        setLoading(false);
      }, 300);
    }
  }, [isOpen, entry.id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      // Mock API call - replace with actual implementation
      const newNoteObj: LeadNote = {
        id: `note-${Date.now()}`,
        entryId: entry.id,
        content: newNote,
        authorId: "current-user",
        authorName: "Current User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isInternal: true
      };

      setNotes(prev => [newNoteObj, ...prev]);
      setNewNote("");
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Notes - {entry.prospect.name}
              </DialogTitle>
              <p className="text-sm text-zinc-500 mt-1">
                Track communication history and internal notes
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[600px]">
          {/* Add New Note */}
          <div className="border-b pb-4 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                className="flex-1"
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.trim() || isSubmitting}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="mb-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                  No notes yet
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300">
                  Add your first note to start tracking communication with this prospect.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium text-sm">{note.authorName}</span>
                        {note.isInternal && (
                          <Badge variant="secondary" className="text-xs">
                            Internal
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.createdAt)}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prospect Info */}
          <div className="border-t pt-4 mt-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Company:</span>
                <span>{entry.prospect.name}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Industry:</span>
                <span>{entry.prospect.industry}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant="outline">{entry.status}</Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}