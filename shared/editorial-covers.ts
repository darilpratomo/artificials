import type { Article } from './content';

// Content assets only: keep legacy covers and every existing layout unchanged.
export const EDITORIAL_COVERS = new Map<string, { file: string; alt: string }>([
  [
    'diffusion-and-flow-matching-image-models',
    {
      file: 'frontier-diffusion-flow',
      alt: 'A porcelain nautilus shell emerges from a cloud of silver particles on dark stone.',
    },
  ],
  [
    'state-space-models-mamba-sequence-memory',
    {
      file: 'frontier-state-space',
      alt: 'A silver ribbon passes through a sequence of glass lenses toward a compact luminous point.',
    },
  ],
  [
    'time-series-foundation-models-forecasting',
    {
      file: 'frontier-forecasting',
      alt: 'A metallic wave splits into translucent arcs after crossing a vertical glass pane.',
    },
  ],
  [
    'graph-neural-networks-relational-data',
    {
      file: 'frontier-graph-learning',
      alt: 'Three clusters of suspended stone and silver spheres connect through thin metallic rods.',
    },
  ],
  [
    'recommendation-systems-cold-start-feedback',
    {
      file: 'frontier-recommendations',
      alt: 'A mechanical selector hovers above stacked silver records beside a separate translucent disc.',
    },
  ],
  [
    'training-data-lineage-deduplication',
    {
      file: 'frontier-data-lineage',
      alt: 'A silver woven fabric separates into fine threads connected to individual spools.',
    },
  ],
  [
    'ai-code-review-evidence-and-human-judgment',
    {
      file: 'frontier-code-review',
      alt: 'A magnifying lens reveals a gap in the joint of a small metallic bridge.',
    },
  ],
  [
    'document-chunking-boundaries-retrieval',
    {
      file: 'frontier-chunking',
      alt: 'A silver book separates into curved page sections with interlocking edges.',
    },
  ],
  [
    'multimodal-embeddings-cross-modal-search',
    {
      file: 'frontier-multimodal-search',
      alt: 'A frosted portrait frame and a silver speech-shaped ribbon cast shadows on a dark surface.',
    },
  ],
  [
    'ai-summarization-numbers-uncertainty',
    {
      file: 'frontier-summarization',
      alt: 'Stacked glass vessels containing distinct beads channel liquid into a silver bowl.',
    },
  ],
  [
    'conformal-prediction-uncertainty-ai',
    {
      file: 'frontier-conformal',
      alt: 'A polished sphere sits inside translucent shells, with a small satellite outside.',
    },
  ],
  [
    'federated-learning-privacy-distributed-data',
    {
      file: 'frontier-federated',
      alt: 'Silver seedlings on four isolated islands connect by light to a suspended glass prism.',
    },
  ],
  [
    'machine-unlearning-deletion-model-memory',
    {
      file: 'frontier-unlearning',
      alt: 'A silver tree with a removed branch stands above a glass block holding a faint reflection.',
    },
  ],
  [
    'ai-training-checkpoints-reproducibility',
    {
      file: 'frontier-checkpoints',
      alt: 'Exploded watch components float in aligned layers above a silver case.',
    },
  ],
  [
    'ai-accessibility-alt-text-context',
    {
      file: 'frontier-accessibility',
      alt: 'A mountain relief projects outward from a dark picture frame into a tactile landscape.',
    },
  ],
  [
    'batch-ai-pipelines-retries-quality',
    {
      file: 'frontier-batch-pipelines',
      alt: 'Silver parcels move through glass inspection gates, with one diverted to a side lane.',
    },
  ],
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
