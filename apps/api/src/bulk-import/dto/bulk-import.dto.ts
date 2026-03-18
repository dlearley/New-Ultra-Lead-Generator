// Bulk Import DTOs

export interface BulkImportJobDto {
  id: string;
  organizationId: string;
  fileName: string;
  fileSize: number;
  
  // Job status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Progress
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  createdRecords: number;
  updatedRecords: number;
  skippedRows: number;
  
  // Processing details
  startedAt?: string;
  completedAt?: string;
  
  // Error tracking
  errors: ImportErrorDto[];
  
  // Configuration
  config: ImportConfigDto;
  
  createdAt: string;
  updatedAt: string;
}

export interface ImportErrorDto {
  row: number;
  field: string;
  value: string;
  error: string;
  errorCode: string;
  suggestion?: string;
}

export interface ImportConfigDto {
  // Entity type
  entityType: 'contacts' | 'companies' | 'deals';
  
  // Column mapping
  columnMapping: Record<string, string>; // CSV column → Field name
  
  // Data handling
  skipFirstRow: boolean; // Header row
  encoding: string; // utf-8, latin1, etc.
  delimiter: string; // comma, tab, semicolon
  
  // Duplicate handling
  duplicateHandling: 'skip' | 'update' | 'create_new';
  duplicateMatchFields: string[]; // Fields to check for duplicates
  
  // Enrichment
  autoEnrich: boolean;
  enrichmentFields: string[];
  
  // Validation
  strictValidation: boolean;
  requiredFields: string[];
  
  // Notifications
  notifyOnComplete: boolean;
  emailNotification?: string;
}

export interface CreateImportJobDto {
  fileName: string;
  fileSize: number;
  config: ImportConfigDto;
}

export interface ImportPreviewDto {
  totalRows: number;
  sampleRows: Array<Record<string, unknown>>;
  detectedColumns: string[];
  suggestedMapping: Record<string, string>;
  detectedIssues: Array<{
    row: number;
    issue: string;
    severity: 'warning' | 'error';
  }>;
}

export interface ColumnMappingSuggestion {
  csvColumn: string;
  suggestedField: string;
  confidence: number;
  alternativeFields: string[];
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportErrorDto[];
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicatesFound: number;
  };
}

export interface ImportProgressDto {
  jobId: string;
  status: string;
  progress: number; // 0-100
  
  currentRow: number;
  totalRows: number;
  
  processedCount: number;
  successCount: number;
  errorCount: number;
  
  currentOperation?: string;
  estimatedTimeRemaining?: number; // seconds
  
  lastError?: ImportErrorDto;
}

export interface ImportTemplateDto {
  entityType: string;
  name: string;
  description?: string;
  columnMapping: Record<string, string>;
  requiredFields: string[];
  sampleData: Array<Record<string, unknown>>;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number; // 0-1
  matchedFields: string[];
  existingRecord?: {
    id: string;
    entityType: string;
    data: Record<string, unknown>;
  };
}

export interface BulkEnrichDto {
  jobId: string;
  recordIds: string[];
  enrichmentFields: string[];
}

export interface ImportSummaryDto {
  jobId: string;
  status: string;
  
  // Results
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  
  // Timing
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  
  // Errors
  errorCount: number;
  errorSamples: ImportErrorDto[];
  
  // Enrichment
  enrichedCount: number;
  enrichmentCreditsUsed: number;
}
