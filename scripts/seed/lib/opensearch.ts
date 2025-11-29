/**
 * OpenSearch indexing utilities for demo data
 */

interface OpenSearchClient {
  index: (params: any) => Promise<any>;
  indices: {
    exists: (params: any) => Promise<any>;
    create: (params: any) => Promise<any>;
  };
}

let client: OpenSearchClient | null = null;

/**
 * Initialize OpenSearch client (if available)
 */
export async function getOpenSearchClient(): Promise<OpenSearchClient | null> {
  if (client) {
    return client;
  }

  try {
    // Dynamic import to handle optional dependency
    const { Client } = await import('@opensearch-project/opensearch');

    const opensearchUrl = process.env.OPENSEARCH_URL || 'http://localhost:9200';

    client = new Client({
      node: opensearchUrl,
      auth: {
        username: process.env.OPENSEARCH_USERNAME || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'admin',
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('✅ OpenSearch client initialized');
    return client;
  } catch (error) {
    console.warn('⚠️  OpenSearch not available, skipping indexing:', error);
    return null;
  }
}

/**
 * Index a business in OpenSearch
 */
export async function indexBusiness(business: any): Promise<void> {
  const client = await getOpenSearchClient();
  if (!client) {
    return;
  }

  try {
    await client.index({
      index: 'businesses',
      id: business.id,
      body: {
        name: business.name,
        description: business.description,
        industry: business.industry,
        sub_industry: business.sub_industry,
        employee_count: business.employee_count,
        annual_revenue: business.annual_revenue,
        location: {
          city: business.city,
          state: business.state,
          country: business.country,
          coordinates: {
            lat: business.latitude,
            lon: business.longitude,
          },
        },
        website: business.website,
        phone: business.phone,
        email: business.email,
        specialties: business.specialties,
        certifications: business.certifications,
        quality_score: business.quality_score,
        created_at: business.created_at,
        updated_at: business.updated_at,
      },
    });
  } catch (error) {
    console.error(`Failed to index business ${business.id}:`, error);
  }
}

/**
 * Bulk index businesses
 */
export async function bulkIndexBusinesses(businesses: any[]): Promise<void> {
  const client = await getOpenSearchClient();
  if (!client || businesses.length === 0) {
    return;
  }

  console.log(`📊 Indexing ${businesses.length} businesses in OpenSearch...`);

  const batchSize = 100;
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    await Promise.all(batch.map((business) => indexBusiness(business)));

    if (i + batchSize < businesses.length) {
      console.log(`   Indexed ${i + batchSize}/${businesses.length} businesses`);
    }
  }

  console.log(`✅ Indexed all ${businesses.length} businesses`);
}

/**
 * Ensure businesses index exists
 */
export async function ensureBusinessesIndex(): Promise<void> {
  const client = await getOpenSearchClient();
  if (!client) {
    return;
  }

  try {
    const indexExists = await client.indices.exists({ index: 'businesses' });

    if (indexExists.body) {
      console.log('✅ Businesses index already exists');
      return;
    }

    await client.indices.create({
      index: 'businesses',
      body: {
        mappings: {
          properties: {
            name: { type: 'text' },
            description: { type: 'text' },
            industry: { type: 'keyword' },
            sub_industry: { type: 'keyword' },
            employee_count: { type: 'integer' },
            annual_revenue: { type: 'long' },
            location: {
              properties: {
                city: { type: 'keyword' },
                state: { type: 'keyword' },
                country: { type: 'keyword' },
                coordinates: { type: 'geo_point' },
              },
            },
            website: { type: 'keyword' },
            phone: { type: 'keyword' },
            email: { type: 'keyword' },
            specialties: { type: 'keyword' },
            certifications: { type: 'keyword' },
            quality_score: { type: 'float' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
          },
        },
      },
    });

    console.log('✅ Created businesses index');
  } catch (error) {
    console.error('Failed to ensure businesses index:', error);
  }
}
