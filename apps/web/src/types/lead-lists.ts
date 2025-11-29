import { Prospect } from './prospect';

export type LeadStatus = "New" | "Contacted" | "Engaged" | "Qualified" | "Converted" | "Closed";
export type AssignmentStatus = "Unassigned" | "Assigned";

export interface LeadList {
  id: string;
  name: string;
  description: string;
  size: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
  aiMetrics: {
    averageScore: number;
    highPotentialCount: number;
    outreachReadyCount: number;
  };
}

export interface LeadListEntry {
  id: string;
  listId: string;
  prospect: Prospect;
  status: LeadStatus;
  assignedRep: string | null;
  assignmentStatus: AssignmentStatus;
  notes: LeadNote[];
  tags: string[];
  aiScore: number;
  lastContacted: string | null;
  nextFollowUp: string | null;
  addedAt: string;
}

export interface LeadNote {
  id: string;
  entryId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isInternal: boolean;
}

export interface BulkAction {
  type: "assign" | "tag" | "export" | "delete";
  selectedEntries: string[];
  payload?: {
    assignTo?: string;
    tags?: string[];
    exportFormat?: "csv" | "xlsx";
  };
}

export interface DuplicateGroup {
  id: string;
  confidence: number;
  prospects: Prospect[];
  masterId?: string;
  status: "pending" | "reviewed" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DataToolsStatus {
  lastDedupeRun: string | null;
  lastEnrichmentRun: string | null;
  lastHygieneCheck: string | null;
  duplicateGroupsCount: number;
  hygieneScore: number;
  enrichmentQueueSize: number;
  exportJobs: ExportJob[];
}

export interface ExportJob {
  id: string;
  type: "list" | "search" | "all";
  format: "csv" | "xlsx";
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileName: string;
  recordCount: number;
  requestedBy: string;
  planLimitReached: boolean;
}

export interface CreateListRequest {
  name: string;
  description: string;
  isPublic: boolean;
  tags?: string[];
  prospectIds?: string[];
}

export interface AISummary {
  listId: string;
  totalProspects: number;
  averageScore: number;
  topIndustries: { industry: string; count: number }[];
  geographicDistribution: { location: string; count: number }[];
  recommendedActions: string[];
  outreachReadiness: {
    ready: number;
    needsResearch: number;
    lowPriority: number;
  };
}