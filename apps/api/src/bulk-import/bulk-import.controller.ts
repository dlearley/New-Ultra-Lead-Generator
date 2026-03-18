import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkImportService } from './bulk-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateImportJobDto,
  ImportConfigDto,
} from './dto/bulk-import.dto';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('bulk-import')
@UseGuards(JwtAuthGuard)
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  // ==========================================
  // Import Job Management
  // ==========================================

  @Post('jobs')
  async createImportJob(
    @Body() dto: CreateImportJobDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.bulkImportService.createImportJob(
      user.organizationId,
      dto.fileName,
      dto.fileSize,
      dto.config
    );
  }

  @Get('jobs/:jobId')
  async getImportJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.bulkImportService.getImportJob(jobId);
  }

  @Post('jobs/:jobId/cancel')
  async cancelImportJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.bulkImportService.cancelImport(jobId);
  }

  // ==========================================
  // CSV Preview & Validation
  // ==========================================

  @Post('jobs/:jobId/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload
  ) {
    const csvContent = file.buffer.toString('utf-8');
    return this.bulkImportService.previewImport(jobId, csvContent);
  }

  @Post('jobs/:jobId/validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload
  ) {
    const csvContent = file.buffer.toString('utf-8');
    return this.bulkImportService.validateImport(jobId, csvContent);
  }

  // ==========================================
  // Import Processing
  // ==========================================

  @Post('jobs/:jobId/process')
  @UseInterceptors(FileInterceptor('file'))
  async processImport(
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload
  ) {
    const csvContent = file.buffer.toString('utf-8');
    return this.bulkImportService.processImport(jobId, csvContent);
  }

  // ==========================================
  // Templates
  // ==========================================

  @Get('templates/:entityType')
  async getImportTemplate(
    @Param('entityType') entityType: string,
    @CurrentUser() user: UserPayload
  ) {
    // Return template based on entity type
    const templates: Record<string, unknown> = {
      contacts: {
        entityType: 'contacts',
        name: 'Contacts Import Template',
        description: 'Template for importing contacts',
        requiredFields: ['email', 'firstName', 'lastName'],
        columnMapping: {
          'Email Address': 'email',
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Phone': 'phone',
          'Job Title': 'title',
          'Company': 'company',
        },
        sampleData: [
          {
            'Email Address': 'john@example.com',
            'First Name': 'John',
            'Last Name': 'Doe',
            'Phone': '+1-555-0123',
            'Job Title': 'CEO',
            'Company': 'Example Inc',
          },
        ],
      },
      companies: {
        entityType: 'companies',
        name: 'Companies Import Template',
        description: 'Template for importing companies',
        requiredFields: ['name'],
        columnMapping: {
          'Company Name': 'name',
          'Website': 'website',
          'Industry': 'industry',
          'Employee Count': 'employeeCount',
          'Annual Revenue': 'annualRevenue',
        },
        sampleData: [
          {
            'Company Name': 'Example Inc',
            'Website': 'https://example.com',
            'Industry': 'Software',
            'Employee Count': '100',
            'Annual Revenue': '10000000',
          },
        ],
      },
    };

    return (
      templates[entityType] || {
        error: 'Template not found',
        availableTemplates: Object.keys(templates),
      }
    );
  }

  @Get('templates/:entityType/download')
  async downloadTemplate(
    @Param('entityType') entityType: string,
    @CurrentUser() user: UserPayload
  ) {
    // Generate CSV template
    const headers: Record<string, string[]> = {
      contacts: ['Email Address', 'First Name', 'Last Name', 'Phone', 'Job Title', 'Company'],
      companies: ['Company Name', 'Website', 'Industry', 'Employee Count', 'Annual Revenue'],
    };

    const csvHeaders = headers[entityType] || [];
    const csvContent = csvHeaders.join(',') + '\n';

    return {
      filename: `${entityType}_import_template.csv`,
      content: csvContent,
      contentType: 'text/csv',
    };
  }
}
