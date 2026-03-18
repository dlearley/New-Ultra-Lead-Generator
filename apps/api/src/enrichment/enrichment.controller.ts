import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// DTOs
class EnrichContactDto {
  contactId!: string;
}

class EnrichEmailDto {
  email!: string;
}

class EnrichCompanyDto {
  domain!: string;
}

class FindEmailDto {
  domain!: string;
  firstName?: string;
  lastName?: string;
}

@Controller('enrichment')
@UseGuards(JwtAuthGuard)
export class EnrichmentController {
  constructor(private readonly enrichmentService: EnrichmentService) {}

  @Get('status')
  async getProviderStatus() {
    const providers = await this.enrichmentService.getProviderStatus();
    return {
      providers,
      allConnected: providers.every((p) => p.connected),
    };
  }

  @Post('contact')
  async enrichContact(@Body() dto: EnrichContactDto) {
    const result = await this.enrichmentService.enrichContact(dto.contactId);
    return result;
  }

  @Post('email/verify')
  async verifyEmail(@Body() dto: EnrichEmailDto) {
    const result = await this.enrichmentService.enrichEmail(dto.email);
    return result;
  }

  @Post('company')
  async enrichCompany(@Body() dto: EnrichCompanyDto) {
    const result = await this.enrichmentService.enrichCompany(dto.domain);
    return result;
  }

  @Post('technologies')
  async detectTechnologies(@Body() dto: EnrichCompanyDto) {
    const result = await this.enrichmentService.detectTechnologies(dto.domain);
    return result;
  }

  @Post('find-email')
  async findEmail(@Body() dto: FindEmailDto) {
    const result = await this.enrichmentService.findEmail(
      dto.domain,
      dto.firstName,
      dto.lastName
    );
    return result;
  }
}
