import { describe, it, expect } from 'vitest';
import { version, CoreService, createCoreService } from './index';

describe('@monorepo/core', () => {
  it('should export version', () => {
    expect(version).toBe('0.0.1');
  });

  it('should create CoreService', () => {
    const service = new CoreService({ environment: 'development' });
    expect(service.getConfig()).toEqual({ environment: 'development' });
  });

  it('should create CoreService with factory', () => {
    const config = { apiUrl: 'http://localhost:3000' };
    const service = createCoreService(config);
    expect(service.getConfig()).toEqual(config);
  });
});
