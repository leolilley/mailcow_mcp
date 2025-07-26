import { MailcowConfig, ConfigValidationResult, ConfigSource } from '../types';
import { validateConfig } from './validation';
import { getDefaultConfig } from './defaults';
import { loadEnvironmentConfig } from './environment';

/**
 * Main configuration manager for the Mailcow MCP server
 */
export class ConfigManager {
  private config: MailcowConfig;
  private sources: ConfigSource[] = [];

  constructor() {
    this.config = getDefaultConfig();
  }

  /**
   * Load configuration from all sources
   */
  async loadConfig(): Promise<ConfigValidationResult> {
    // Load from environment variables
    const envConfig = loadEnvironmentConfig();
    this.mergeConfig(envConfig);

    // Validate the final configuration
    const validation = validateConfig(this.config);
    
    if (validation.success) {
      this.sources.push({ 
        type: 'environment', 
        config: envConfig,
        priority: 80,
        timestamp: new Date()
      });
    }

    return validation;
  }

  /**
   * Get the current configuration
   */
  getConfig(): MailcowConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MailcowConfig>): ConfigValidationResult {
    const newConfig = { ...this.config, ...updates };
    const validation = validateConfig(newConfig);
    
    if (validation.success) {
      this.config = newConfig;
    }

    return validation;
  }

  /**
   * Get configuration sources
   */
  getSources(): ConfigSource[] {
    return [...this.sources];
  }

  /**
   * Merge configuration with proper precedence
   */
  private mergeConfig(newConfig: Partial<MailcowConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      api: {
        ...this.config.api,
        ...newConfig.api,
      },
      auth: {
        ...this.config.auth,
        ...newConfig.auth,
      },
      server: {
        ...this.config.server,
        ...newConfig.server,
      },
      logging: {
        ...this.config.logging,
        ...newConfig.logging,
      },
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager(); 