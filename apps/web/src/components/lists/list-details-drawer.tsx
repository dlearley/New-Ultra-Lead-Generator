"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  X, 
  Download, 
  Trash2, 
  UserPlus, 
  User,
  Tag, 
  MessageSquare,
  Brain,
  Send,
  Search,
  Filter,
  ChevronDown,
  MoreVertical,
  Edit,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { LeadList, LeadListEntry, LeadStatus, BulkAction } from "@/types/lead-lists";
import { NotesDrawer } from "./notes-drawer";
import { AISummaryModal } from "./ai-summary-modal";

interface ListDetailsDrawerProps {
  list: LeadList;
  isOpen: boolean;
  onClose: () => void;
}

export function ListDetailsDrawer({ list, isOpen, onClose }: ListDetailsDrawerProps) {
  const [entries, setEntries] = useState<LeadListEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [selectedEntryForNotes, setSelectedEntryForNotes] = useState<LeadListEntry | null>(null);
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Generate mock entries
      const mockEntries: LeadListEntry[] = Array.from({ length: Math.min(list.size, 10) }, (_, i) => ({
        id: `entry-${i}`,
        listId: list.id,
        prospect: {
          id: `prospect-${i}`,
          name: `Company ${i + 1}`,
          description: `Sample company description ${i + 1}`,
          industry: ["Technology", "Healthcare", "Finance", "Manufacturing"][i % 4],
          naics: "511210",
          sic: "7374",
          ownership: "Private" as const,
          businessType: "B2B" as const,
          location: {
            city: ["New York", "San Francisco", "Chicago", "Austin"][i % 4],
            state: ["NY", "CA", "IL", "TX"][i % 4],
            country: "USA",
            lat: 40.7128 + (i * 0.1),
            lng: -74.0060 + (i * 0.1)
          },
          revenueRange: [1000000, 50000000],
          employeesRange: [50, 500],
          reviewCount: Math.floor(Math.random() * 100),
          reviewRating: 3 + Math.random() * 2,
          reviewPlatforms: ["Google", "Yelp"],
          recentReviewDays: Math.floor(Math.random() * 30),
          isHiring: Math.random() > 0.5,
          hasWebsite: true,
          hasGenericEmail: Math.random() > 0.5,
          techStack: ["React", "Node.js", "AWS"],
          aiLeadScore: 5 + Math.random() * 5,
          fundingStage: "Series A",
          lastFundingRound: "2024-01-15",
          tags: [`tag-${i % 3}`, `category-${i % 2}`]
        },
        status: ["New", "Contacted", "Engaged", "Qualified"][i % 4] as LeadStatus,
        assignedRep: i % 3 === 0 ? `Rep ${i + 1}` : null,
        assignmentStatus: i % 3 === 0 ? "Assigned" : "Unassigned",
        notes: [],
        tags: [`priority-${i % 3}`, `region-${i % 2}`],
        aiScore: 5 + Math.random() * 5,
        lastContacted: i % 2 === 0 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        nextFollowUp: i % 3 === 0 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        addedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      setTimeout(() => {
        setEntries(mockEntries);
        setLoading(false);
      }, 500);
    }
  }, [isOpen, list]);

  const filteredEntries = entries.filter(entry =>
    entry.prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.prospect.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.prospect.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(filteredEntries.map(entry => entry.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const handleBulkAction = async (action: BulkAction) => {
    // Mock API call - replace with actual implementation
    console.log("Bulk action:", action);
    
    if (action.type === "delete") {
      if (confirm(`Are you sure you want to delete ${selectedEntries.length} entries?`)) {
        setEntries(prev => prev.filter(entry => !selectedEntries.includes(entry.id)));
        setSelectedEntries([]);
      }
    } else if (action.type === "assign") {
      const assignTo = prompt("Assign to (rep name):");
      if (assignTo) {
        setEntries(prev => prev.map(entry => 
          selectedEntries.includes(entry.id) 
            ? { ...entry, assignedRep: assignTo, assignmentStatus: "Assigned" }
            : entry
        ));
        setSelectedEntries([]);
      }
    } else if (action.type === "tag") {
      const tag = prompt("Add tag:");
      if (tag) {
        setEntries(prev => prev.map(entry => 
          selectedEntries.includes(entry.id) 
            ? { ...entry, tags: [...entry.tags, tag] }
            : entry
        ));
        setSelectedEntries([]);
      }
    }
  };

  const openNotesDrawer = (entry: LeadListEntry) => {
    setSelectedEntryForNotes(entry);
    setIsNotesDrawerOpen(true);
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors = {
      "New": "bg-blue-100 text-blue-800",
      "Contacted": "bg-yellow-100 text-yellow-800", 
      "Engaged": "bg-purple-100 text-purple-800",
      "Qualified": "bg-green-100 text-green-800",
      "Converted": "bg-emerald-100 text-emerald-800",
      "Closed": "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{list.name}</DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">{list.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">{list.size} Total</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">Avg Score: {list.aiMetrics.averageScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">{list.aiMetrics.highPotentialCount} High Potential</span>
              </div>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setIsAISummaryOpen(true)}>
                <Brain className="w-4 h-4 mr-2" />
                AI Summary
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <Input
                  placeholder="Search prospects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedEntries.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedEntries.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction({ type: "assign", selectedEntries })}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign to Rep
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction({ type: "tag", selectedEntries })}>
                      <Tag className="w-4 h-4 mr-2" />
                      Add Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction({ type: "export", selectedEntries, payload: { exportFormat: "csv" } })}>
                      <Download className="w-4 h-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction({ type: "delete", selectedEntries })} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Rep</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Last Contacted</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <TableCell>
                          <Checkbox
                            checked={selectedEntries.includes(entry.id)}
                            onCheckedChange={(checked) => handleSelectEntry(entry.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{entry.prospect.name}</div>
                            <div className="text-sm text-zinc-500">
                              {entry.prospect.industry} • {entry.prospect.location.city}, {entry.prospect.location.state}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(entry.status)}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.assignedRep ? (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="text-sm">{entry.assignedRep}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-zinc-400" />
                            <span className="text-sm font-medium">{entry.aiScore.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          {formatDate(entry.lastContacted)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {entry.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {entry.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{entry.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => openNotesDrawer(entry)}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                View Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Send className="w-4 h-4 mr-2" />
                                Start Outreach
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedEntryForNotes && (
        <NotesDrawer
          entry={selectedEntryForNotes}
          isOpen={isNotesDrawerOpen}
          onClose={() => {
            setIsNotesDrawerOpen(false);
            setSelectedEntryForNotes(null);
          }}
        />
      )}

      <AISummaryModal
        list={list}
        isOpen={isAISummaryOpen}
        onClose={() => setIsAISummaryOpen(false)}
      />
    </>
  );
}