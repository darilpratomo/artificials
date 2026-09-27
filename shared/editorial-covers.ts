import type { Article } from './content';

// Content assets only: keep legacy covers and every existing layout unchanged.
export const EDITORIAL_COVERS = new Map<string, { file: string; alt: string }>([
  [
    'mixture-of-experts-active-parameters',
    {
      file: 'insight-moe',
      alt: 'A silver routing hub connects to separate glass chambers, with only a subset illuminated.',
    },
  ],
  [
    'kv-cache-context-memory-serving',
    {
      file: 'insight-kv-cache',
      alt: 'Translucent memory tiles follow a curved rail beside a dark processor.',
    },
  ],
  [
    'speculative-decoding-draft-verify',
    {
      file: 'insight-speculative-decoding',
      alt: 'A small metallic scout approaches glass stepping stones beneath a large verification arch.',
    },
  ],
  [
    'lora-adapters-training-deployment',
    {
      file: 'insight-lora-adapters',
      alt: 'A delicate silver adapter frame attaches to a much larger graphite monolith.',
    },
  ],
  [
    'preference-optimization-dpo-data-quality',
    {
      file: 'insight-preference-learning',
      alt: 'Two silver ribbons meet in a balanced glass comparison instrument.',
    },
  ],
  [
    'multilingual-tokenization-product-budgets',
    {
      file: 'insight-multilingual-tokens',
      alt: 'Different segmented ceramic shapes travel through parallel silver channels.',
    },
  ],
  [
    'vision-models-resolution-crops-evidence',
    {
      file: 'insight-vision-resolution',
      alt: 'An optical lens reveals fine mechanical details through clear and frosted windows.',
    },
  ],
  [
    'image-generation-seeds-consistency-workflow',
    {
      file: 'insight-image-consistency',
      alt: 'Three silver chairs share a material treatment while retaining different shapes.',
    },
  ],
  [
    'video-models-temporal-consistency-evaluation',
    {
      file: 'insight-video-continuity',
      alt: 'A metallic hummingbird appears at successive wing positions across glass frames.',
    },
  ],
  [
    'speech-recognition-wer-critical-errors',
    {
      file: 'insight-speech-evaluation',
      alt: 'A silver acoustic wave passes through glass and becomes separated luminous beads.',
    },
  ],
  [
    'text-to-sql-safe-analytics-design',
    {
      file: 'insight-text-to-sql',
      alt: 'A query key hovers above database drawers with one illuminated route.',
    },
  ],
  [
    'permission-aware-rag-retrieval',
    {
      file: 'insight-rag-permissions',
      alt: 'A silver key illuminates one authorized compartment in a sealed glass archive.',
    },
  ],
  [
    'agent-memory-correction-expiry-deletion',
    {
      file: 'insight-agent-memory',
      alt: 'Glass memory capsules occupy a circular garden while one dissolves into particles.',
    },
  ],
  [
    'ai-tool-retries-idempotency',
    {
      file: 'insight-tool-idempotency',
      alt: 'A single polished cube follows a mechanical loop through an illuminated checkpoint.',
    },
  ],
  [
    'mcp-connections-trust-boundaries',
    {
      file: 'insight-mcp-boundaries',
      alt: 'A transparent bridge with an inspection chamber connects two distinct islands.',
    },
  ],
  [
    'benchmark-contamination-evaluation-evidence',
    {
      file: 'insight-benchmark-contamination',
      alt: 'An inspection lens examines puzzle pieces on opposite sides of a glass boundary.',
    },
  ],
  [
    'ai-rankings-confidence-intervals',
    {
      file: 'insight-ranking-uncertainty',
      alt: 'Suspended balance beams sit at closely spaced heights amid translucent bands.',
    },
  ],
  [
    'ai-inference-energy-measurement',
    {
      file: 'insight-ai-energy',
      alt: 'A computing tile sits beside a glass energy reservoir and a metal heat radiator.',
    },
  ],
  [
    'browser-local-ai-download-performance',
    {
      file: 'insight-browser-ai',
      alt: 'A small luminous model sculpture is enclosed above a laptop beside a disconnected cable.',
    },
  ],
  [
    'ai-agent-observability-traces-outcomes',
    {
      file: 'insight-agent-tracing',
      alt: 'Branching rails of glass event beads reveal a blocked connection and an alternate path.',
    },
  ],
]);

export function articleCover(article: Pick<Article, 'slug' | 'category'>) {
  const cover = EDITORIAL_COVERS.get(article.slug);
  if (cover) return cover;
  if (article.category === 'Research')
    return {
      file: 'benchmarks',
      alt: 'Silver towers connected by fine light threads, illustrating AI benchmark comparisons.',
    };
  if (article.category === 'AI models')
    return {
      file: 'context',
      alt: 'Layers of translucent glass surrounding a silver orb, illustrating model memory and context.',
    };
  return {
    file: 'engineering',
    alt: 'Floating metal and glass layers connected to a central core, illustrating application architecture.',
  };
}
