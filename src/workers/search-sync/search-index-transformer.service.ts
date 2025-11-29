import { Injectable, Logger } from '@nestjs/common';
import { Business } from '@database/entities/business.entity';
import { SearchIndexDocument } from './search-sync.dto';

@Injectable()
export class SearchIndexTransformerService {
  private readonly logger = new Logger(SearchIndexTransformerService.name);

  transformBusinessToIndexDocument(
    business: Business,
    tenantId?: string,
    organizationId?: string,
  ): SearchIndexDocument {
    const doc: SearchIndexDocument = {
      id: business.id,
      name: business.name,
      description: business.description || undefined,
      industry: business.industry || undefined,
      location: business.location || undefined,
      latitude: business.latitude ? Number(business.latitude) : undefined,
      longitude: business.longitude ? Number(business.longitude) : undefined,
      revenue: business.revenue || undefined,
      employees: business.employees || undefined,
      hiring: business.hiring || undefined,
      techStack: business.techStack?.length ? business.techStack : undefined,
      metadata: business.metadata || undefined,
      tenantId: tenantId || undefined,
      organizationId: organizationId || undefined,
      indexedAt: Date.now(),
      aiScore: undefined, // Placeholder for AI scoring
    };

    // Add geopoint if coordinates are available
    if (
      business.latitude &&
      business.longitude &&
      !Number.isNaN(Number(business.latitude)) &&
      !Number.isNaN(Number(business.longitude))
    ) {
      doc.geopoint = [Number(business.longitude), Number(business.latitude)];
    }

    return doc;
  }

  transformBusinessesToIndexDocuments(
    businesses: Business[],
    tenantId?: string,
    organizationId?: string,
  ): SearchIndexDocument[] {
    return businesses.map((business) =>
      this.transformBusinessToIndexDocument(business, tenantId, organizationId),
    );
  }

  validateIndexDocument(doc: SearchIndexDocument): boolean {
    if (!doc.id || !doc.name) {
      this.logger.warn(
        `Invalid document: missing id or name for document ${doc.id}`,
      );
      return false;
    }
    return true;
  }
}
