import path from 'path';
import { AppConfig } from '../config.ts';
import { LocalStore } from './localStore.ts';
import type { DataStore } from './store.ts';

export async function createDataStore(config: AppConfig, localPath?: string): Promise<DataStore> {
  const targetPath = localPath ?? path.join(config.dataDir, 'store.json');
  const store = new LocalStore(targetPath);
  await store.init();
  return store;
}
