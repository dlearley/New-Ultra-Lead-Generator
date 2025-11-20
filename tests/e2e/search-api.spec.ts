import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock data for tests
const mockSearchPayload = {
  query: 'tech company',
  industry: 'Technology',
  skip: 0,
  take: 10,
};

const mockSavedSearchPayload = {
  name: 'Tech Companies in SF',
  description: 'Search for tech companies',
  query: mockSearchPayload,
};

test.describe('Search API - Businesses Endpoint', () => {
  test('should search businesses with text query', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: mockSearchPayload,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('results');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('aggregations');
    expect(body.results).toBeInstanceOf(Array);
  });

  test('should return paginated results', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'software',
        skip: 0,
        take: 5,
      },
    });

    const body = await response.json();
    expect(body.results.length).toBeLessThanOrEqual(5);
    expect(body.skip).toBe(0);
    expect(body.take).toBe(5);
  });

  test('should support geo distance filtering', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        geoLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          distanceKm: 25,
        },
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
  });

  test('should support multi-filter combinations', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'software',
        industry: 'Technology',
        minRevenue: 1000000,
        maxRevenue: 10000000,
        techStack: ['JavaScript', 'React'],
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
    expect(body).toHaveProperty('total');
  });

  test('should return aggregations/facets', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: mockSearchPayload,
    });

    const body = await response.json();
    expect(body.aggregations).toBeDefined();
    expect(body.aggregations).toHaveProperty('industry');
    expect(body.aggregations).toHaveProperty('location');
    expect(body.aggregations).toHaveProperty('techStack');
    expect(body.aggregations).toHaveProperty('revenueRanges');
    expect(body.aggregations).toHaveProperty('hiringLevels');
  });

  test('should support fuzzy matching', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'techs companys',
        fuzzyMatching: 'high',
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
  });

  test('should support sorting by different fields', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'tech',
        sortBy: 'revenue',
        sortOrder: 'desc',
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
  });

  test('should return suggestions', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: mockSearchPayload,
    });

    const body = await response.json();
    if (body.suggestions && body.suggestions.length > 0) {
      expect(Array.isArray(body.suggestions)).toBe(true);
      expect(body.suggestions[0]).toHaveProperty('text');
      expect(body.suggestions[0]).toHaveProperty('score');
    }
  });
});

test.describe('Saved Searches API - CRUD Operations', () => {
  let createdSearchId: string;

  test('should create a saved search', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/saved-searches`, {
      data: mockSavedSearchPayload,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(mockSavedSearchPayload.name);
    expect(body.description).toBe(mockSavedSearchPayload.description);
    expect(body).toHaveProperty('createdAt');
    expect(body).toHaveProperty('updatedAt');

    createdSearchId = body.id;
  });

  test('should list saved searches', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/saved-searches`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.items)).toBe(true);
  });

  test('should get a single saved search', async ({ request }) => {
    // First create a saved search
    const createResponse = await request.post(`${API_BASE_URL}/saved-searches`, {
      data: mockSavedSearchPayload,
    });

    const createdSearch = await createResponse.json();
    const searchId = createdSearch.id;

    // Then retrieve it
    const getResponse = await request.get(`${API_BASE_URL}/saved-searches/${searchId}`);

    expect(getResponse.status()).toBe(200);
    const body = await getResponse.json();
    expect(body.id).toBe(searchId);
    expect(body.name).toBe(mockSavedSearchPayload.name);
  });

  test('should update a saved search', async ({ request }) => {
    // Create a saved search
    const createResponse = await request.post(`${API_BASE_URL}/saved-searches`, {
      data: mockSavedSearchPayload,
    });

    const createdSearch = await createResponse.json();
    const searchId = createdSearch.id;

    // Update it
    const updateResponse = await request.put(`${API_BASE_URL}/saved-searches/${searchId}`, {
      data: {
        name: 'Updated Tech Companies Search',
        description: 'Updated description',
      },
    });

    expect(updateResponse.status()).toBe(200);
    const body = await updateResponse.json();
    expect(body.name).toBe('Updated Tech Companies Search');
    expect(body.description).toBe('Updated description');
  });

  test('should delete a saved search', async ({ request }) => {
    // Create a saved search
    const createResponse = await request.post(`${API_BASE_URL}/saved-searches`, {
      data: mockSavedSearchPayload,
    });

    const createdSearch = await createResponse.json();
    const searchId = createdSearch.id;

    // Delete it
    const deleteResponse = await request.delete(`${API_BASE_URL}/saved-searches/${searchId}`);

    expect(deleteResponse.status()).toBe(204);

    // Verify it's deleted
    const getResponse = await request.get(`${API_BASE_URL}/saved-searches/${searchId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('should filter saved searches by userId', async ({ request }) => {
    const userId = 'user-123';

    const response = await request.get(
      `${API_BASE_URL}/saved-searches?userId=${userId}`,
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  test('should filter saved searches by organizationId', async ({ request }) => {
    const organizationId = 'org-123';

    const response = await request.get(
      `${API_BASE_URL}/saved-searches?organizationId=${organizationId}`,
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  test('should support pagination in saved searches list', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/saved-searches?skip=0&take=5`,
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.length).toBeLessThanOrEqual(5);
  });
});

test.describe('Search API - Text and Geo Combinations', () => {
  test('should support text search with geo filtering', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'tech startup',
        geoLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          distanceKm: 50,
        },
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
    expect(body).toHaveProperty('aggregations');
  });

  test('should support address-based geo search', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'software',
        geoLocation: {
          address: 'San Francisco',
          distanceKm: 25,
        },
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
  });

  test('should apply "did you mean" suggestions on misspelled queries', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/search/businesses`, {
      data: {
        query: 'tecnologi compny',
        fuzzyMatching: 'high',
        skip: 0,
        take: 20,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
    if (body.suggestions && body.suggestions.length > 0) {
      expect(body.suggestions[0]).toHaveProperty('text');
    }
  });
});
