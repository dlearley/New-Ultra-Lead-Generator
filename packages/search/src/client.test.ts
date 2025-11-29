import { describe, it, expect, vi } from 'vitest';
import { 
  createOpenSearchClient, 
  OpenSearchConfig 
} from './client';

describe('OpenSearchClient Configuration', () => {
  it('should create client with basic config', () => {
    const config: OpenSearchConfig = {
      node: 'http://localhost:9200'
    };
    
    const client = createOpenSearchClient(config);
    expect(client).toBeDefined();
    expect(client.getConfig()).toEqual(config);
  });

  it('should create client with auth config', () => {
    const config: OpenSearchConfig = {
      node: 'http://localhost:9200',
      auth: {
        username: 'admin',
        password: 'admin'
      }
    };
    
    const client = createOpenSearchClient(config);
    expect(client).toBeDefined();
    expect(client.getConfig()).toEqual(config);
  });

  it('should create client with SSL config', () => {
    const config: OpenSearchConfig = {
      node: 'https://localhost:9200',
      ssl: {
        ca: 'ca-cert',
        rejectUnauthorized: false
      }
    };
    
    const client = createOpenSearchClient(config);
    expect(client).toBeDefined();
    expect(client.getConfig()).toEqual(config);
  });

  it('should create client with all options', () => {
    const config: OpenSearchConfig = {
      node: 'https://localhost:9200',
      auth: {
        username: 'admin',
        password: 'admin'
      },
      ssl: {
        ca: 'ca-cert',
        rejectUnauthorized: true
      },
      maxRetries: 5,
      requestTimeout: 60000,
      sniffOnStart: true,
      sniffInterval: 600000
    };
    
    const client = createOpenSearchClient(config);
    expect(client).toBeDefined();
    expect(client.getConfig()).toEqual(config);
  });
});