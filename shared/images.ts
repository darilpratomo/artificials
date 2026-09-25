import type { BenchmarkSnapshot } from './benchmarks.ts';
import {
  arenaSource,
  buildBoards,
  type ArenaSnapshot,
  type Board,
  type BoardSource,
} from './arena.ts';

/** The image models page: Arena's boards and an automated test. */
export interface Images {
  version: 1;
  boards: Board[];
  /** T2I-CoReBench composition and reasoning scores, highest first. */
  test: { name: string; maker: string; makerId: string; score: number }[];
  sources: BoardSource[];
}

const BOARDS: Record<string, string> = {
  'text-to-image': 'Text to image',
  'image-edit': 'Image editing',
};

export function buildImages({
  arena,
  benchmarks,
}: {
  arena?: ArenaSnapshot;
  benchmarks: BenchmarkSnapshot;
}): Images {
  const image = benchmarks.categories.find((category) => category.id === 'image');
  const test = (image?.rows ?? []).map((row) => ({
    name: row.model,
    maker: row.provider === 'See source' ? 'Not reported' : row.provider,
    makerId: row.provider === 'See source' ? 'unknown' : row.providerId,
    score: row.score,
  }));
  const corebench = benchmarks.sources.find((source) => source.id === image?.sourceId);
  return {
    version: 1,
    boards: buildBoards(arena, BOARDS),
    test,
    sources: [
      ...(arena ? [arenaSource(arena)] : []),
      ...(corebench
        ? [
            {
              id: corebench.id,
              name: corebench.name,
              url: corebench.url,
              license: corebench.license,
              licenseUrl: corebench.licenseUrl,
            },
          ]
        : []),
    ],
  };
}
