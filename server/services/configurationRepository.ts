import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProductConfiguration } from '@shared/types';
import { CONFIGURATION_ID_PATTERN } from '@shared/utils/id';

export interface StoredConfiguration {
  configuration: ProductConfiguration;
  savedAt: string;
}

/** Persistence port for saved configurations; swap for a database in production. */
export interface ConfigurationRepository {
  save(configuration: ProductConfiguration): Promise<StoredConfiguration>;
  get(id: string): Promise<StoredConfiguration | null>;
}

export class InMemoryConfigurationRepository implements ConfigurationRepository {
  private readonly items = new Map<string, StoredConfiguration>();

  async save(configuration: ProductConfiguration): Promise<StoredConfiguration> {
    const stored = { configuration, savedAt: new Date().toISOString() };
    this.items.set(configuration.id, stored);
    return stored;
  }

  async get(id: string): Promise<StoredConfiguration | null> {
    return this.items.get(id) ?? null;
  }
}

/** Stores each configuration as a JSON file. Suitable for local development and demos. */
export class FileConfigurationRepository implements ConfigurationRepository {
  constructor(private readonly directory: string) {}

  private fileFor(id: string): string {
    if (!CONFIGURATION_ID_PATTERN.test(id)) throw new Error('Invalid configuration id');
    return path.join(this.directory, `${id}.json`);
  }

  async save(configuration: ProductConfiguration): Promise<StoredConfiguration> {
    await mkdir(this.directory, { recursive: true });
    const stored = { configuration, savedAt: new Date().toISOString() };
    await writeFile(this.fileFor(configuration.id), JSON.stringify(stored), 'utf8');
    return stored;
  }

  async get(id: string): Promise<StoredConfiguration | null> {
    if (!CONFIGURATION_ID_PATTERN.test(id)) return null;
    try {
      return JSON.parse(await readFile(this.fileFor(id), 'utf8')) as StoredConfiguration;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
}
