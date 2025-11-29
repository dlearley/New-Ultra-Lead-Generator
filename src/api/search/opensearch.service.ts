import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearchjs';
import { ConfigService } from '@nestjs/config';
import { BusinessSearchInput } from '@common/dtos/business-search.input';
import { SearchResponseDto, Aggregation, BusinessSearchResult } from '@common/dtos/search-response.dto';
import { OpenSearchQueryBuilder } from '@common/utils/query-builder';

@Injectable()
export class OpenSearchService {
  private client: Client;
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly indexName = 'businesses';

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const host = this.configService.get('OPENSEARCH_HOST', 'localhost');
    const port = this.configService.get('OPENSEARCH_PORT', 9200);
    const protocol = this.configService.get('OPENSEARCH_PROTOCOL', 'http');

    this.client = new Client({
      nodes: [`${protocol}://${host}:${port}`],
    });
  }

  async createIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: this.indexName });
      if (indexExists.statusCode !== 200) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                tokenizer: {
                  autocomplete: {
                    type: 'edge_ngram',
                    min_gram: 1,
                    max_gram: 20,
                    token_chars: ['letter', 'digit', 'whitespace'],
                  },
                },
                analyzer: {
                  autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'autocomplete',
                    filter: ['lowercase', 'stop'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                name: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
                description: { type: 'text', analyzer: 'standard' },
                industry: { type: 'keyword' },
                location: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
                latitude: { type: 'geo_point' },
                longitude: { type: 'geo_point' },
                geopoint: { type: 'geo_point' },
                revenue: { type: 'integer' },
                employees: { type: 'integer' },
                hiring: { type: 'integer' },
                techStack: { type: 'keyword' },
                metadata: { type: 'object', enabled: false },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`Index ${this.indexName} created successfully`);
      }
    } catch (error) {
      this.logger.error(`Error creating index: ${error.message}`);
    }
  }

  async indexDocument(document: any): Promise<void> {
    try {
      const doc = {
        ...document,
        geopoint: document.latitude && document.longitude ? [document.longitude, document.latitude] : null,
      };

      await this.client.index({
        index: this.indexName,
        id: document.id,
        body: doc,
      });
    } catch (error) {
      this.logger.error(`Error indexing document: ${error.message}`);
      throw error;
    }
  }

  async search(input: BusinessSearchInput): Promise<SearchResponseDto> {
    try {
      const query = OpenSearchQueryBuilder.buildQuery(input);
      const response = await this.client.search({
        index: this.indexName,
        body: query,
      });

      return this.formatSearchResponse(response, input);
    } catch (error) {
      this.logger.error(`Error searching: ${error.message}`);
      throw error;
    }
  }

  private formatSearchResponse(response: any, input: BusinessSearchInput): SearchResponseDto {
    const results: BusinessSearchResult[] = response.body.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
      score: hit._score,
    }));

    const aggregations = this.formatAggregations(response.body.aggregations);

    return {
      results,
      total: response.body.hits.total.value,
      skip: input.skip || 0,
      take: input.take || 20,
      aggregations,
      suggestions: this.generateSuggestions(results, input.query),
    };
  }

  private formatAggregations(aggs: any): Aggregation {
    return {
      industry: aggs.industries?.buckets?.map((bucket: any) => ({
        name: bucket.key,
        count: bucket.doc_count,
        value: bucket.key,
      })) || [],
      location: aggs.locations?.buckets?.map((bucket: any) => ({
        name: bucket.key,
        count: bucket.doc_count,
        value: bucket.key,
      })) || [],
      techStack: aggs.techStacks?.buckets?.map((bucket: any) => ({
        name: bucket.key,
        count: bucket.doc_count,
        value: bucket.key,
      })) || [],
      revenueRanges: aggs.revenueRanges?.buckets?.map((bucket: any, index: number) => ({
        name: `Range ${index + 1}`,
        count: bucket.doc_count,
      })) || [],
      hiringLevels: aggs.hiringLevels?.buckets?.map((bucket: any, index: number) => ({
        name: `Level ${index + 1}`,
        count: bucket.doc_count,
      })) || [],
    };
  }

  private generateSuggestions(results: BusinessSearchResult[], query?: string): any[] {
    if (!query || results.length === 0) {
      return [];
    }

    // Simple "did you mean" logic based on top results
    const suggestions = results.slice(0, 3).map((result, index) => ({
      text: result.name,
      score: result.score || 0,
    }));

    return suggestions;
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id,
      });
    } catch (error) {
      this.logger.error(`Error deleting document: ${error.message}`);
    }
  }

  async bulkIndex(documents: any[]): Promise<void> {
    try {
      const body = documents.flatMap((doc) => [
        { index: { _index: this.indexName, _id: doc.id } },
        {
          ...doc,
          geopoint:
            doc.latitude && doc.longitude ? [doc.longitude, doc.latitude] : null,
        },
      ]);

      await this.client.bulk({ body });
      this.logger.log(`Bulk indexed ${documents.length} documents`);
    } catch (error) {
      this.logger.error(`Error bulk indexing: ${error.message}`);
      throw error;
    }
  }
}
