import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EnrichmentService } from '../enrichment/enrichment.service';
import {
  BulkImportJobDto,
  ImportErrorDto,
  ImportConfigDto,
  ImportPreviewDto,
  ImportValidationResult,
  ImportProgressDto,
  DuplicateCheckResult,
  ImportSummaryDto,
} from './dto/bulk-import.dto';
import { Prisma } from '@prisma/client';
import * as csv from 'csv-parse/sync';
import * as fuzzball from 'fuzzball';

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
}

interface ProcessedRecord {
  rowNumber: number;
  status: 'created' | 'updated' | 'skipped' | 'error';
  recordId?: string;
  errors?: ImportErrorDto[];
}

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);
  private readonly activeJobs: Map<string, AbortController> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly enrichmentService: EnrichmentService
  ) {}

  // ==========================================
  // Import Job Management
  // ==========================================

  async createImportJob(
    organizationId: string,
    fileName: string,
    fileSize: number,
    config: ImportConfigDto
  ): Promise<{ jobId: string }> {
    const job = await this.prisma.$transaction(async (tx) => {
      // Check if import credits available (optional)
      
      return tx.bulkImportJob.create({
        data: {
          organizationId,
          fileName,
          fileSize,
          status: 'pending',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdRecords: 0,
          updatedRecords: 0,
          skippedRows: 0,
          config: config as unknown as Prisma.InputJsonValue,
          errors: [],
        },
      });
    });

    this.logger.log(`Created import job ${job.id} for ${fileName}`);

    return { jobId: job.id };
  }

  async previewImport(
    jobId: string,
    csvContent: string
  ): Promise<ImportPreviewDto> {
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    const config = job.config as ImportConfigDto;

    // Parse CSV
    const records: Array<Record<string, string>> = (csv.parse as any)(csvContent, {
      columns: config.skipFirstRow ? true : false,
      delimiter: config.delimiter || ',',
      encoding: config.encoding || 'utf-8',
      skip_empty_lines: true,
    });

    const detectedColumns = config.skipFirstRow
      ? Object.keys(records[0] || {})
      : (records as any)[0]?.map((_: unknown, i: number) => `Column ${i + 1}`) || [];

    // Suggest column mapping
    const suggestedMapping = this.suggestColumnMapping(detectedColumns);

    // Detect issues in sample rows
    const sampleRows = records.slice(0, 5);
    const detectedIssues = this.detectIssues(sampleRows, config);

    return {
      totalRows: records.length,
      sampleRows,
      detectedColumns,
      suggestedMapping,
      detectedIssues,
    };
  }

  async validateImport(
    jobId: string,
    csvContent: string
  ): Promise<ImportValidationResult> {
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    const config = job.config as ImportConfigDto;
    const errors: ImportErrorDto[] = [];
    const warnings: ImportValidationResult['warnings'] = [];

    // Parse CSV
    const records: Array<Record<string, string>> = (csv.parse as any)(csvContent, {
      columns: true,
      delimiter: config.delimiter || ',',
      encoding: config.encoding || 'utf-8',
      skip_empty_lines: true,
    }) as Array<Record<string, string>>;

    let validRows = 0;
    let invalidRows = 0;
    let duplicatesFound = 0;

    // Validate each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + (config.skipFirstRow ? 2 : 1);

      // Map columns to fields
      const mappedData = this.mapColumns(row, config.columnMapping);

      // Validate required fields
      const missingFields = config.requiredFields.filter(
        (field) => !mappedData[field] || mappedData[field].trim() === ''
      );

      if (missingFields.length > 0) {
        errors.push({
          row: rowNumber,
          field: missingFields.join(', '),
          value: '',
          error: `Missing required fields: ${missingFields.join(', ')}`,
          errorCode: 'MISSING_REQUIRED',
        });
        invalidRows++;
        continue;
      }

      // Validate email format
      if (mappedData.email) {
        const emailValid = this.validateEmail(mappedData.email);
        if (!emailValid) {
          errors.push({
            row: rowNumber,
            field: 'email',
            value: mappedData.email,
            error: 'Invalid email format',
            errorCode: 'INVALID_EMAIL',
            suggestion: this.suggestEmailFix(mappedData.email),
          });
          if (config.strictValidation) {
            invalidRows++;
            continue;
          }
        }
      }

      // Check for duplicates
      if (config.duplicateMatchFields.length > 0) {
        const duplicateCheck = await this.checkDuplicate(
          job.organizationId,
          config.entityType,
          mappedData,
          config.duplicateMatchFields
        );

        if (duplicateCheck.isDuplicate) {
          duplicatesFound++;
          if (config.duplicateHandling === 'skip') {
            warnings.push({
              row: rowNumber,
              field: duplicateCheck.matchedFields.join(', '),
              message: `Duplicate found (confidence: ${Math.round(duplicateCheck.confidence * 100)}%)`,
            });
          }
        }
      }

      validRows++;
    }

    return {
      isValid: invalidRows === 0,
      errors: errors.slice(0, 100), // Limit errors returned
      warnings,
      stats: {
        totalRows: records.length,
        validRows,
        invalidRows,
        duplicatesFound,
      },
    };
  }

  async processImport(
    jobId: string,
    csvContent: string
  ): Promise<ImportSummaryDto> {
    const startTime = Date.now();
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    const config = job.config as ImportConfigDto;
    const abortController = new AbortController();
    this.activeJobs.set(jobId, abortController);

    try {
      // Update job status
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      // Parse CSV
      const records: Array<Record<string, string>> = (csv.parse as any)(csvContent, {
        columns: true,
        delimiter: config.delimiter || ',',
        encoding: config.encoding || 'utf-8',
        skip_empty_lines: true,
      }) as Array<Record<string, string>>;

      // Update total rows
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: { totalRows: records.length },
      });

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      let enriched = 0;
      const jobErrors: ImportErrorDto[] = [];
      let enrichmentCreditsUsed = 0;

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        if (abortController.signal.aborted) {
          throw new Error('Import cancelled');
        }

        const batch = records.slice(i, i + batchSize);
        const batchResults = await this.processBatch(
          job.organizationId,
          jobId,
          batch,
          config,
          i + (config.skipFirstRow ? 2 : 1)
        );

        // Aggregate results
        batchResults.forEach((result) => {
          switch (result.status) {
            case 'created':
              created++;
              break;
            case 'updated':
              updated++;
              break;
            case 'skipped':
              skipped++;
              break;
            case 'error':
              failed++;
              if (result.errors) {
                jobErrors.push(...result.errors);
              }
              break;
          }
        });

        // Update progress
        const processedCount = i + batch.length;
        await this.prisma.bulkImportJob.update({
          where: { id: jobId },
          data: {
            processedRows: processedCount,
            createdRecords: created,
            updatedRecords: updated,
            skippedRows: skipped,
            invalidRows: failed,
            errors: jobErrors.slice(0, 1000) as unknown as Prisma.InputJsonValue[],
          },
        });
      }

      // Auto-enrich if configured
      if (config.autoEnrich && (created > 0 || updated > 0)) {
        // TODO: Implement bulk enrichment
        enriched = created + updated;
      }

      // Complete job
      const completedJob = await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: failed > 0 ? 'completed' : 'completed',
          completedAt: new Date(),
        },
      });

      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      return {
        jobId,
        status: completedJob.status,
        totalProcessed: records.length,
        created,
        updated,
        skipped,
        failed,
        startedAt: job.startedAt?.toISOString() || '',
        completedAt: completedJob.completedAt?.toISOString() || '',
        durationSeconds,
        errorCount: failed,
        errorSamples: jobErrors.slice(0, 10),
        enrichedCount: enriched,
        enrichmentCreditsUsed,
      };
    } catch (error) {
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: [
            ...(job.errors as unknown as ImportErrorDto[]),
            {
              row: 0,
              field: 'system',
              value: '',
              error: error instanceof Error ? error.message : 'Unknown error',
              errorCode: 'SYSTEM_ERROR',
            },
          ] as unknown as Prisma.InputJsonValue[],
        },
      });

      throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async cancelImport(jobId: string): Promise<{ success: boolean }> {
    const abortController = this.activeJobs.get(jobId);
    if (abortController) {
      abortController.abort();
      
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: { status: 'cancelled' },
      });

      return { success: true };
    }

    return { success: false };
  }

  async getImportJob(jobId: string): Promise<BulkImportJobDto> {
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    return {
      id: job.id,
      organizationId: job.organizationId,
      fileName: job.fileName,
      fileSize: job.fileSize,
      status: job.status as BulkImportJobDto['status'],
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      validRows: job.validRows,
      invalidRows: job.invalidRows,
      createdRecords: job.createdRecords,
      updatedRecords: job.updatedRecords,
      skippedRows: job.skippedRows,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      errors: (job.errors as unknown as ImportErrorDto[]) || [],
      config: job.config as unknown as ImportConfigDto,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private suggestColumnMapping(detectedColumns: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    const fieldPatterns: Record<string, string[]> = {
      email: ['email', 'e-mail', 'email_address', 'emailaddress'],
      firstName: ['first_name', 'firstname', 'first name', 'fname', 'first'],
      lastName: ['last_name', 'lastname', 'last name', 'lname', 'last', 'surname'],
      phone: ['phone', 'phone_number', 'phonenumber', 'telephone', 'mobile', 'cell'],
      company: ['company', 'company_name', 'companyname', 'organization', 'org', 'employer'],
      title: ['title', 'job_title', 'jobtitle', 'position', 'role'],
      website: ['website', 'domain', 'url', 'web', 'site'],
      industry: ['industry', 'sector', 'vertical'],
      city: ['city', 'town', 'location'],
      state: ['state', 'province', 'region'],
      country: ['country', 'nation'],
    };

    detectedColumns.forEach((column) => {
      const normalizedColumn = column.toLowerCase().replace(/[_\s-]/g, '');
      
      for (const [field, patterns] of Object.entries(fieldPatterns)) {
        if (patterns.some((p) => normalizedColumn.includes(p.replace(/[_\s-]/g, '')))) {
          mapping[column] = field;
          break;
        }
      }
    });

    return mapping;
  }

  private detectIssues(
    rows: Array<Record<string, unknown>>,
    config: ImportConfigDto
  ): ImportPreviewDto['detectedIssues'] {
    const issues: ImportPreviewDto['detectedIssues'] = [];

    rows.forEach((row, index) => {
      // Check for empty rows
      const isEmpty = Object.values(row).every(
        (v) => v === null || v === undefined || String(v).trim() === ''
      );
      if (isEmpty) {
        issues.push({
          row: index + 1,
          issue: 'Empty row detected',
          severity: 'warning',
        });
      }

      // Check for malformed emails
      const emailColumn = Object.keys(config.columnMapping).find(
        (k) => config.columnMapping[k] === 'email'
      );
      if (emailColumn && row[emailColumn]) {
        const email = String(row[emailColumn]);
        if (!this.validateEmail(email)) {
          issues.push({
            row: index + 1,
            issue: `Invalid email format: ${email}`,
            severity: 'error',
          });
        }
      }
    });

    return issues;
  }

  private mapColumns(
    row: Record<string, string>,
    columnMapping: Record<string, string>
  ): Record<string, string> {
    const mapped: Record<string, string> = {};
    
    for (const [csvColumn, fieldName] of Object.entries(columnMapping)) {
      if (row[csvColumn] !== undefined) {
        mapped[fieldName] = row[csvColumn];
      }
    }

    return mapped;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private suggestEmailFix(email: string): string | undefined {
    // Common typos
    const fixes: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'yahoo.co': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
    };

    const domain = email.split('@')[1];
    if (domain && fixes[domain]) {
      return email.replace(domain, fixes[domain]);
    }

    return undefined;
  }

  private async checkDuplicate(
    organizationId: string,
    entityType: string,
    data: Record<string, string>,
    matchFields: string[]
  ): Promise<DuplicateCheckResult> {
    if (entityType === 'contacts') {
      // Check email first
      if (data.email) {
        const existing = await this.prisma.contact.findFirst({
          where: {
            organizationId,
            email: { equals: data.email, mode: 'insensitive' },
          },
        });

        if (existing) {
          return {
            isDuplicate: true,
            confidence: 1.0,
            matchedFields: ['email'],
            existingRecord: {
              id: existing.id,
              entityType: 'contact',
              data: existing as unknown as Record<string, unknown>,
            },
          };
        }
      }

      // Fuzzy match on name + company
      if (data.firstName && data.lastName && data.company) {
        const candidates = await this.prisma.contact.findMany({
          where: {
            organizationId,
            company: {
              name: { contains: data.company, mode: 'insensitive' },
            },
          },
          include: { company: true },
          take: 10,
        });

        for (const candidate of candidates) {
          const nameScore = fuzzball.ratio(
            `${data.firstName} ${data.lastName}`.toLowerCase(),
            `${candidate.firstName} ${candidate.lastName}`.toLowerCase()
          );

          if (nameScore >= 85) {
            return {
              isDuplicate: true,
              confidence: nameScore / 100,
              matchedFields: ['firstName', 'lastName', 'company'],
              existingRecord: {
                id: candidate.id,
                entityType: 'contact',
                data: candidate as unknown as Record<string, unknown>,
              },
            };
          }
        }
      }
    }

    if (entityType === 'companies') {
      // Check domain
      if (data.domain || data.website) {
        const domain = data.domain || this.extractDomain(data.website || '');
        if (domain) {
          const existing = await this.prisma.company.findFirst({
            where: {
              organizationId,
              OR: [
                { domain: { equals: domain, mode: 'insensitive' } },
                { website: { contains: domain, mode: 'insensitive' } },
              ],
            },
          });

          if (existing) {
            return {
              isDuplicate: true,
              confidence: 1.0,
              matchedFields: ['domain'],
              existingRecord: {
                id: existing.id,
                entityType: 'company',
                data: existing as unknown as Record<string, unknown>,
              },
            };
          }
        }
      }

      // Fuzzy match on name
      if (data.company || data.name) {
        const companyName = data.company || data.name;
        const candidates = await this.prisma.company.findMany({
          where: {
            organizationId,
          },
          take: 20,
        });

        for (const candidate of candidates) {
          const nameScore = fuzzball.ratio(
            companyName.toLowerCase(),
            candidate.name.toLowerCase()
          );

          if (nameScore >= 90) {
            return {
              isDuplicate: true,
              confidence: nameScore / 100,
              matchedFields: ['name'],
              existingRecord: {
                id: candidate.id,
                entityType: 'company',
                data: candidate as unknown as Record<string, unknown>,
              },
            };
          }
        }
      }
    }

    return { isDuplicate: false, confidence: 0, matchedFields: [] };
  }

  private async processBatch(
    organizationId: string,
    jobId: string,
    batch: Array<Record<string, string>>,
    config: ImportConfigDto,
    startRowNumber: number
  ): Promise<ProcessedRecord[]> {
    const results: ProcessedRecord[] = [];

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowNumber = startRowNumber + i;

      try {
        const mappedData = this.mapColumns(row, config.columnMapping);

        // Check for duplicates
        const duplicateCheck = await this.checkDuplicate(
          organizationId,
          config.entityType,
          mappedData,
          config.duplicateMatchFields
        );

        if (duplicateCheck.isDuplicate) {
          if (config.duplicateHandling === 'skip') {
            results.push({
              rowNumber,
              status: 'skipped',
            });
            continue;
          }

          if (config.duplicateHandling === 'update') {
            // Update existing record
            if (config.entityType === 'contacts') {
              await this.prisma.contact.update({
                where: { id: duplicateCheck.existingRecord!.id },
                data: this.buildContactData(mappedData, organizationId),
              });
            } else if (config.entityType === 'companies') {
              await this.prisma.company.update({
                where: { id: duplicateCheck.existingRecord!.id },
                data: this.buildCompanyData(mappedData, organizationId),
              });
            }

            results.push({
              rowNumber,
              status: 'updated',
              recordId: duplicateCheck.existingRecord!.id,
            });
            continue;
          }
        }

        // Create new record
        if (config.entityType === 'contacts') {
          const contact = await this.createContact(organizationId, mappedData);
          results.push({
            rowNumber,
            status: 'created',
            recordId: contact.id,
          });
        } else if (config.entityType === 'companies') {
          const company = await this.createCompany(organizationId, mappedData);
          results.push({
            rowNumber,
            status: 'created',
            recordId: company.id,
          });
        }
      } catch (error) {
        results.push({
          rowNumber,
          status: 'error',
          errors: [
            {
              row: rowNumber,
              field: 'system',
              value: '',
              error: error instanceof Error ? error.message : 'Unknown error',
              errorCode: 'PROCESSING_ERROR',
            },
          ],
        });
      }
    }

    return results;
  }

  private buildContactData(
    data: Record<string, string>,
    organizationId: string
  ): Prisma.ContactCreateInput {
    return {
      organization: { connect: { id: organizationId } },
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone,
      title: data.title,
    };
  }

  private buildCompanyData(
    data: Record<string, string>,
    organizationId: string
  ): Prisma.CompanyCreateInput {
    return {
      organization: { connect: { id: organizationId } },
      name: data.company || data.name || 'Unknown',
      domain: data.domain || this.extractDomain(data.website || ''),
      industry: data.industry,
      website: data.website,
    };
  }

  private async createContact(
    organizationId: string,
    data: Record<string, string>
  ) {
    return this.prisma.contact.create({
      data: this.buildContactData(data, organizationId),
    });
  }

  private async createCompany(
    organizationId: string,
    data: Record<string, string>
  ) {
    return this.prisma.company.create({
      data: this.buildCompanyData(data, organizationId),
    });
  }

  private extractDomain(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return undefined;
    }
  }
}
