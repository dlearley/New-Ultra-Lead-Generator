import { createOpenSearchClient, OpenSearchConfig } from './client';
import { businessLeadsIndexDefinition, BUSINESS_LEADS_INDEX } from './mappings';

export interface IndexMigrationOptions {
  deleteExisting?: boolean;
  skipIfExists?: boolean;
  updateMapping?: boolean;
}

export class IndexMigrationService {
  private client = createOpenSearchClient(this.config);

  constructor(private config: OpenSearchConfig) {}

  async migrate(options: IndexMigrationOptions = {}): Promise<void> {
    const {
      deleteExisting = false,
      skipIfExists = false,
      updateMapping = false
    } = options;

    console.log('Starting business leads index migration...');

    // Check if index exists
    const indexExists = await this.client.indexExists(BUSINESS_LEADS_INDEX);
    
    if (indexExists) {
      if (skipIfExists) {
        console.log(`Index ${BUSINESS_LEADS_INDEX} already exists, skipping migration`);
        return;
      }

      if (deleteExisting) {
        console.log(`Deleting existing index ${BUSINESS_LEADS_INDEX}...`);
        await this.client.deleteIndex(BUSINESS_LEADS_INDEX);
      } else if (updateMapping) {
        console.log(`Updating mapping for existing index ${BUSINESS_LEADS_INDEX}...`);
        await this.client.updateIndexMapping(BUSINESS_LEADS_INDEX, businessLeadsIndexDefinition.mappings);
        console.log('Index mapping updated successfully');
        return;
      } else {
        console.log(`Index ${BUSINESS_LEADS_INDEX} already exists, use deleteExisting=true to recreate`);
        return;
      }
    }

    // Create the index with full settings and mappings
    console.log(`Creating index ${BUSINESS_LEADS_INDEX}...`);
    await this.client.createIndex(BUSINESS_LEADS_INDEX, businessLeadsIndexDefinition.mappings);
    
    // Update settings separately if needed (some settings need to be set during creation)
    console.log('Index created successfully');

    // Verify index health
    try {
      const health = await this.client.health();
      console.log(`Cluster health: ${health.status}`);
      
      // Check index mapping
      const mapping = await this.client.getClient().indices.getMapping({ 
        index: BUSINESS_LEADS_INDEX 
      });
      
      console.log('Index mapping verified:', Object.keys(mapping.body[BUSINESS_LEADS_INDEX].mappings.properties));
    } catch (error) {
      console.error('Error verifying index:', error);
      throw error;
    }

    console.log('Business leads index migration completed successfully');
  }

  async rollback(): Promise<void> {
    console.log(`Rolling back index ${BUSINESS_LEADS_INDEX}...`);
    await this.client.deleteIndex(BUSINESS_LEADS_INDEX);
    console.log('Index rollback completed');
  }

  async verify(): Promise<boolean> {
    try {
      const exists = await this.client.indexExists(BUSINESS_LEADS_INDEX);
      if (!exists) {
        console.log(`Index ${BUSINESS_LEADS_INDEX} does not exist`);
        return false;
      }

      // Check if all required fields exist in mapping
      const mapping = await this.client.getClient().indices.getMapping({ 
        index: BUSINESS_LEADS_INDEX 
      });
      
      const properties = mapping.body[BUSINESS_LEADS_INDEX].mappings.properties;
      const requiredFields = [
        'id', 'name', 'canonicalName', 'industry', 'businessType', 
        'coordinates', 'revenue', 'employeeCount'
      ];

      const missingFields = requiredFields.filter(field => !(field in properties));
      
      if (missingFields.length > 0) {
        console.log(`Missing required fields in mapping: ${missingFields.join(', ')}`);
        return false;
      }

      console.log(`Index ${BUSINESS_LEADS_INDEX} verification passed`);
      return true;
    } catch (error) {
      console.error('Index verification failed:', error);
      return false;
    }
  }
}

export function createIndexMigrationService(config: OpenSearchConfig): IndexMigrationService {
  return new IndexMigrationService(config);
}