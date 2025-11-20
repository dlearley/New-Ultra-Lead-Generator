import { Client, ClientOptions } from '@opensearch-project/opensearch';

export interface OpenSearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  ssl?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
  maxRetries?: number;
  requestTimeout?: number;
  sniffOnStart?: boolean;
  sniffInterval?: number;
}

export class OpenSearchClient {
  private client: Client;
  private config: OpenSearchConfig;

  constructor(config: OpenSearchConfig) {
    this.config = config;
    
    const clientOptions: ClientOptions = {
      node: config.node,
      maxRetries: config.maxRetries || 3,
      requestTimeout: config.requestTimeout || 30000,
      sniffOnStart: config.sniffOnStart || false,
      sniffInterval: config.sniffInterval || 300000,
    };

    if (config.auth) {
      clientOptions.auth = config.auth;
    }

    if (config.ssl) {
      clientOptions.ssl = config.ssl;
    }

    this.client = new Client(clientOptions);
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.body !== undefined;
    } catch (error) {
      console.error('OpenSearch ping failed:', error);
      return false;
    }
  }

  async health(): Promise<any> {
    try {
      const response = await this.client.cluster.health();
      return response.body;
    } catch (error) {
      console.error('OpenSearch health check failed:', error);
      throw error;
    }
  }

  async createIndex(index: string, mapping: any): Promise<void> {
    try {
      await this.client.indices.create({
        index,
        body: {
          mappings: mapping
        }
      });
    } catch (error: any) {
      if (error.statusCode === 400 && error.body?.error?.type === 'resource_already_exists_exception') {
        console.log(`Index ${index} already exists`);
      } else {
        throw error;
      }
    }
  }

  async updateIndexMapping(index: string, mapping: any): Promise<void> {
    try {
      await this.client.indices.putMapping({
        index,
        body: mapping
      });
    } catch (error) {
      console.error(`Failed to update mapping for index ${index}:`, error);
      throw error;
    }
  }

  async indexExists(index: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index });
      return response.statusCode === 200;
    } catch (error) {
      return false;
    }
  }

  async deleteIndex(index: string): Promise<void> {
    try {
      await this.client.indices.delete({ index });
    } catch (error: any) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

  async indexDocument(index: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index,
        id,
        body: document,
        refresh: false
      });
    } catch (error) {
      console.error(`Failed to index document ${id} in ${index}:`, error);
      throw error;
    }
  }

  async bulkIndex(index: string, documents: Array<{ id: string; doc: any }>): Promise<void> {
    if (documents.length === 0) return;

    const body = documents.flatMap(({ id, doc }) => [
      { index: { _index: index, _id: id } },
      doc
    ]);

    try {
      const response = await this.client.bulk({ body });
      
      if (response.body.errors) {
        const errors = response.body.items
          .filter((item: any) => item.index.error)
          .map((item: any) => item.index.error);
        console.error('Bulk indexing errors:', errors);
        throw new Error(`Bulk indexing failed with ${errors.length} errors`);
      }
    } catch (error) {
      console.error('Bulk indexing failed:', error);
      throw error;
    }
  }

  async search(index: string, query: any): Promise<any> {
    try {
      const response = await this.client.search({
        index,
        body: query
      });
      return response.body;
    } catch (error) {
      console.error(`Search failed for index ${index}:`, error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  getConfig(): OpenSearchConfig {
    return this.config;
  }
}

export function createOpenSearchClient(config: OpenSearchConfig): OpenSearchClient {
  return new OpenSearchClient(config);
}