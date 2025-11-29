"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  Filter,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  Eye,
  Zap
} from "lucide-react";
import { DataToolsStatus, DuplicateGroup, ExportJob } from "@/types/lead-lists";

export default function DataToolsPage() {
  const [status, setStatus] = useState<DataToolsStatus | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"deduplication" | "enrichment" | "exports">("deduplication");

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockStatus: DataToolsStatus = {
      lastDedupeRun: "2024-11-20T02:00:00Z",
      lastEnrichmentRun: "2024-11-19T18:30:00Z",
      lastHygieneCheck: "2024-11-18T12:00:00Z",
      duplicateGroupsCount: 23,
      hygieneScore: 87,
      enrichmentQueueSize: 156,
      exportJobs: []
    };

    const mockDuplicates: DuplicateGroup[] = [
      {
        id: "dup-1",
        confidence: 0.95,
        prospects: [
          {
            id: "p1",
            name: "Tech Solutions Inc",
            description: "Software development company",
            industry: "Technology",
            naics: "511210",
            sic: "7374",
            ownership: "Private" as const,
            businessType: "B2B" as const,
            location: {
              city: "San Francisco",
              state: "CA",
              country: "USA",
              lat: 37.7749,
              lng: -122.4194
            },
            revenueRange: [1000000, 5000000],
            employeesRange: [10, 50],
            reviewCount: 12,
            reviewRating: 4.5,
            reviewPlatforms: ["Google"],
            recentReviewDays: 15,
            isHiring: true,
            hasWebsite: true,
            hasGenericEmail: false,
            techStack: ["React", "Node.js"],
            aiLeadScore: 8.2,
            fundingStage: "Seed",
            lastFundingRound: "2024-03-15",
            tags: ["software", "startup"]
          },
          {
            id: "p2",
            name: "Tech Solutions, Inc.",
            description: "Custom software development services",
            industry: "Technology",
            naics: "511210",
            sic: "7374",
            ownership: "Private" as const,
            businessType: "B2B" as const,
            location: {
              city: "San Francisco",
              state: "CA",
              country: "USA",
              lat: 37.7749,
              lng: -122.4194
            },
            revenueRange: [2000000, 10000000],
            employeesRange: [20, 100],
            reviewCount: 8,
            reviewRating: 4.2,
            reviewPlatforms: ["Google", "Clutch"],
            recentReviewDays: 30,
            isHiring: true,
            hasWebsite: true,
            hasGenericEmail: false,
            techStack: ["React", "Node.js", "AWS"],
            aiLeadScore: 8.5,
            fundingStage: "Series A",
            lastFundingRound: "2024-06-20",
            tags: ["software", "enterprise"]
          }
        ],
        status: "pending",
        resolvedAt: undefined,
        resolvedBy: undefined
      },
      {
        id: "dup-2",
        confidence: 0.78,
        prospects: [
          {
            id: "p3",
            name: "Global Health Systems",
            description: "Healthcare technology solutions",
            industry: "Healthcare",
            naics: "511210",
            sic: "7374",
            ownership: "Private" as const,
            businessType: "B2B" as const,
            location: {
              city: "New York",
              state: "NY",
              country: "USA",
              lat: 40.7128,
              lng: -74.0060
            },
            revenueRange: [5000000, 25000000],
            employeesRange: [50, 200],
            reviewCount: 24,
            reviewRating: 4.1,
            reviewPlatforms: ["Google", "Healthgrades"],
            recentReviewDays: 7,
            isHiring: false,
            hasWebsite: true,
            hasGenericEmail: true,
            techStack: ["Python", "AWS", "Docker"],
            aiLeadScore: 7.8,
            fundingStage: "Series B",
            lastFundingRound: "2023-11-30",
            tags: ["healthcare", "enterprise"]
          },
          {
            id: "p4",
            name: "GHS Healthcare",
            description: "Medical software and systems",
            industry: "Healthcare",
            naics: "511210",
            sic: "7374",
            ownership: "Private" as const,
            businessType: "B2B" as const,
            location: {
              city: "New York",
              state: "NY",
              country: "USA",
              lat: 40.7128,
              lng: -74.0060
            },
            revenueRange: [3000000, 15000000],
            employeesRange: [30, 150],
            reviewCount: 18,
            reviewRating: 3.9,
            reviewPlatforms: ["Google"],
            recentReviewDays: 45,
            isHiring: true,
            hasWebsite: true,
            hasGenericEmail: false,
            techStack: ["Python", "Azure"],
            aiLeadScore: 7.2,
            fundingStage: "Series A",
            lastFundingRound: "2024-02-15",
            tags: ["healthcare", "startup"]
          }
        ],
        status: "pending",
        resolvedAt: undefined,
        resolvedBy: undefined
      }
    ];

    const mockExports: ExportJob[] = [
      {
        id: "exp-1",
        type: "list",
        format: "csv",
        status: "completed",
        createdAt: "2024-11-20T10:30:00Z",
        completedAt: "2024-11-20T10:32:00Z",
        downloadUrl: "/downloads/leads-q4-2024.csv",
        fileName: "leads-q4-2024.csv",
        recordCount: 156,
        requestedBy: "Sarah Chen",
        planLimitReached: false
      },
      {
        id: "exp-2",
        type: "search",
        format: "xlsx",
        status: "processing",
        createdAt: "2024-11-20T11:15:00Z",
        fileName: "tech-companies-nyc.xlsx",
        recordCount: 89,
        requestedBy: "Mike Johnson",
        planLimitReached: false
      },
      {
        id: "exp-3",
        type: "all",
        format: "csv",
        status: "failed",
        createdAt: "2024-11-19T16:45:00Z",
        fileName: "all-prospects.csv",
        recordCount: 2340,
        requestedBy: "Sarah Chen",
        planLimitReached: true
      }
    ];

    setTimeout(() => {
      setStatus(mockStatus);
      setDuplicateGroups(mockDuplicates);
      setExportJobs(mockExports);
      setLoading(false);
    }, 500);
  }, []);

  const handleRunDeduplication = async () => {
    // Mock API call
    alert("Deduplication process started. This may take a few minutes...");
  };

  const handleRunEnrichment = async () => {
    // Mock API call
    alert("Data enrichment process started. This may take several minutes...");
  };

  const handleRunHygieneCheck = async () => {
    // Mock API call
    alert("Data hygiene check started. This will validate email addresses, phone numbers, and other contact information.");
  };

  const handleResolveDuplicates = async (action: "merge" | "keep" | "delete") => {
    if (selectedDuplicates.length === 0) {
      alert("Please select duplicate groups to resolve");
      return;
    }

    // Mock API call
    console.log(`Resolving ${selectedDuplicates.length} duplicate groups with action: ${action}`);
    setDuplicateGroups(prev => prev.filter(group => !selectedDuplicates.includes(group.id)));
    setSelectedDuplicates([]);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "pending": "bg-yellow-100 text-yellow-800",
      "reviewed": "bg-blue-100 text-blue-800",
      "resolved": "bg-green-100 text-green-800",
      "completed": "bg-green-100 text-green-800",
      "processing": "bg-blue-100 text-blue-800",
      "failed": "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      "pending": <Clock className="w-4 h-4" />,
      "reviewed": <Eye className="w-4 h-4" />,
      "resolved": <CheckCircle className="w-4 h-4" />,
      "completed": <CheckCircle className="w-4 h-4" />,
      "processing": <RefreshCw className="w-4 h-4 animate-spin" />,
      "failed": <XCircle className="w-4 h-4" />
    };
    return icons[status as keyof typeof icons] || <Clock className="w-4 h-4" />;
  };

  const getHygieneScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Data Tools
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 mt-2">
          Manage data quality, deduplication, enrichment, and exports
        </p>
      </div>

      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-zinc-600">Duplicate Groups</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {status.duplicateGroupsCount}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Last run: {formatDate(status.lastDedupeRun)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-zinc-600">Enrichment Queue</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {status.enrichmentQueueSize}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Last run: {formatDate(status.lastEnrichmentRun)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-zinc-600">Hygiene Score</span>
            </div>
            <div className={`text-2xl font-bold ${getHygieneScoreColor(status.hygieneScore)}`}>
              {status.hygieneScore}%
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Last check: {formatDate(status.lastHygieneCheck)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-zinc-600">Export Jobs</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {exportJobs.length}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Active: {exportJobs.filter(job => job.status === "processing").length}
            </div>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={handleRunDeduplication}>
          <Database className="w-4 h-4 mr-2" />
          Run Deduplication
        </Button>
        <Button onClick={handleRunEnrichment} variant="outline">
          <Zap className="w-4 h-4 mr-2" />
          Run Enrichment
        </Button>
        <Button onClick={handleRunHygieneCheck} variant="outline">
          <CheckCircle className="w-4 h-4 mr-2" />
          Check Data Hygiene
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("deduplication")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "deduplication"
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            Deduplication ({duplicateGroups.length})
          </button>
          <button
            onClick={() => setActiveTab("enrichment")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "enrichment"
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            Enrichment Status
          </button>
          <button
            onClick={() => setActiveTab("exports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "exports"
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
            >
            Export Center ({exportJobs.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "deduplication" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search duplicates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {selectedDuplicates.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-zinc-600">
                  {selectedDuplicates.length} selected
                </span>
                <Button size="sm" variant="outline" onClick={() => handleResolveDuplicates("merge")}>
                  Merge Selected
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolveDuplicates("delete")}>
                  Delete Duplicates
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <Card key={group.id} className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedDuplicates.includes(group.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDuplicates(prev => [...prev, group.id]);
                      } else {
                        setSelectedDuplicates(prev => prev.filter(id => id !== group.id));
                      }
                    }}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(group.status)}>
                          {getStatusIcon(group.status)}
                          <span className="ml-1">{group.status}</span>
                        </Badge>
                        <span className="text-sm text-zinc-500">
                          {group.confidence >= 0.9 ? "High" : group.confidence >= 0.7 ? "Medium" : "Low"} confidence
                        </span>
                        <span className="text-sm font-medium">
                          {(group.confidence * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <div className="text-sm text-zinc-500">
                        {group.prospects.length} potential duplicates
                      </div>
                    </div>

                    <div className="space-y-3">
                      {group.prospects.map((prospect, index) => (
                        <div key={prospect.id} className="border rounded-lg p-3 bg-zinc-50 dark:bg-zinc-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{prospect.name}</div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                                {prospect.industry} • {prospect.location.city}, {prospect.location.state}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                Revenue: ${prospect.revenueRange[0].toLocaleString()} - ${prospect.revenueRange[1].toLocaleString()} • 
                                Employees: {prospect.employeesRange[0]} - {prospect.employeesRange[1]}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-600">
                                Score: {prospect.aiLeadScore.toFixed(1)}
                              </span>
                              {index === 0 && (
                                <Badge variant="outline">Master</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {duplicateGroups.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                No duplicates found
              </h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Run deduplication to identify potential duplicate records.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "enrichment" && status && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Enrichment Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Queue Size</span>
                  <span className="text-2xl font-bold">{status.enrichmentQueueSize}</span>
                </div>
                <div className="text-sm text-zinc-500">
                  Prospects waiting for data enrichment
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Last Run</span>
                  <span className="text-sm">{formatDate(status.lastEnrichmentRun)}</span>
                </div>
                <div className="text-sm text-zinc-500">
                  Previous enrichment completed
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Enrichment Actions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Company Information</div>
                  <div className="text-sm text-zinc-500">Update company details, revenue, employee count</div>
                </div>
                <Button size="sm" variant="outline">Enrich</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Contact Information</div>
                  <div className="text-sm text-zinc-500">Validate emails, find phone numbers</div>
                </div>
                <Button size="sm" variant="outline">Enrich</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Technology Stack</div>
                  <div className="text-sm text-zinc-500">Identify technologies and tools used</div>
                </div>
                <Button size="sm" variant="outline">Enrich</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "exports" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Export History</h3>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              New Export
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.fileName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{job.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {job.format === "csv" ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                      <span className="uppercase">{job.format}</span>
                    </div>
                  </TableCell>
                  <TableCell>{job.recordCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(job.status)}>
                      {getStatusIcon(job.status)}
                      <span className="ml-1">{job.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>{job.requestedBy}</TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(job.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {job.status === "completed" && job.downloadUrl && (
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {job.planLimitReached && (
                        <div title="Plan limit reached">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {exportJobs.length === 0 && (
            <div className="text-center py-12">
              <Download className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                No exports yet
              </h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Create your first export to download prospect data.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}