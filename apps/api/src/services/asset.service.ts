import type { Asset } from '@marketpilot/types';
import { AssetRegistry } from './market-data/registry.js';

export interface AssetSearchResult { data: Asset[]; count: number; }

export class AssetService {
  private readonly registry = new AssetRegistry();

  search(query: string): AssetSearchResult {
    const data = this.registry.search(query);
    return { data, count: data.length };
  }
}
