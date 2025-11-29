// Core Utilities Library
export const version = '0.0.1';

export interface Config {
  apiUrl?: string;
  environment?: 'development' | 'production';
}

export class CoreService {
  config: Config;

  constructor(config: Config = {}) {
    this.config = config;
  }

  getConfig() {
    return this.config;
  }
}

export const createCoreService = (config: Config) => new CoreService(config);
