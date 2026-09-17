export interface BenchmarkRow {
  id: string;
  model: string;
  provider: string;
  providerId: string;
  score: number;
  rank: number;
  sourceUrl: string;
}
export interface BenchmarkCategory {
  id: string;
  name: string;
  sourceId: string;
  description: string;
  methodology: string;
  rows: BenchmarkRow[];
}
export interface BenchmarkSource {
  id: string;
  name: string;
  url: string;
  dataUrl: string;
  checkedAt: string;
  edition: string;
  sourceUpdatedAt: string | null;
  license: string;
  licenseUrl: string;
}
export interface BenchmarkSnapshot {
  version: 1;
  sources: BenchmarkSource[];
  categories: BenchmarkCategory[];
}
