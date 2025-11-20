// Main entry point for the Snyk API Client
export * from './generated';

// Re-export commonly used classes for convenience
export {
  Configuration,
  ConfigurationParameters,
} from './generated/configuration';

export {
  BaseAPI,
} from './generated/base';

// Export all API classes
export * from './generated/api';

import { Configuration } from './generated/configuration';

/**
 * Helper function to create a configured Snyk API client
 * @param apiKey - Snyk API key
 * @param basePath - Optional base path (defaults to https://api.snyk.io/rest)
 * @returns Configuration object
 */
export function createConfiguration(
  apiKey: string,
  basePath: string = 'https://api.snyk.io/rest'
) {
  return new Configuration({ apiKey, basePath });
}
