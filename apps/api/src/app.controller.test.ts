import { describe, it, expect } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
    controller = new AppController(service);
  });

  it('should return hello message', () => {
    const result = controller.getHello();
    expect(result.message).toBe('Hello from NestJS API');
  });

  it('should return health status', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
  });
});
