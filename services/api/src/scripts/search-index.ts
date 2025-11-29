import { Client } from '@opensearch-project/opensearch';
import { AppDataSource } from '../data-source';

const openSearchClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
});

async function createSearchIndex() {
  try {
    console.log('Creating OpenSearch index...');
    
    // Create index with mapping
    const indexName = 'business-leads';
    
    const indexMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text' },
          email: { type: 'keyword' },
          company: { type: 'text' },
          status: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
    };

    const exists = await openSearchClient.indices.exists({ index: indexName });
    
    if (exists.body) {
      console.log(`Index ${indexName} already exists`);
    } else {
      await openSearchClient.indices.create({
        index: indexName,
        body: indexMapping,
      });
      console.log(`Index ${indexName} created successfully`);
    }

    // Index some sample data
    const sampleData = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const body = sampleData.flatMap(doc => [
      { index: { _index: indexName, _id: doc.id } },
      doc,
    ]);

    await openSearchClient.bulk({ body });
    console.log('Sample data indexed successfully');

  } catch (error) {
    console.error('Error creating search index:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    process.exit(0);
  }
}

createSearchIndex();