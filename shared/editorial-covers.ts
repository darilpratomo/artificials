import type { Article } from './content';

// Content assets only: keep legacy covers and every existing layout unchanged.
export const EDITORIAL_COVERS = new Map<string, { file: string; alt: string }>([
  [
    'visual-guide-model-price-capability-frontier',
    {
      file: 'visual-frontier',
      alt: 'A plot of selected model capability values against reference token prices.',
    },
  ],
  [
    'visual-guide-benchmark-rankings-by-task',
    {
      file: 'visual-skills',
      alt: 'A matrix of selected LiveBench configuration scores across coding, mathematics, reasoning, and language.',
    },
  ],
  [
    'visual-guide-prefill-decode-kv-cache',
    {
      file: 'visual-inference',
      alt: 'A schematic connects prompt preparation, prefill, the key-value cache, and a decoding loop.',
    },
  ],
  [
    'visual-guide-retrieval-evidence-answer',
    {
      file: 'visual-evidence',
      alt: 'Three fictional policy documents pass through an evidence check to a supported twelve-day answer.',
    },
  ],
  [
    'flashattention-gpu-memory-movement',
    {
      file: 'fieldnotes-flashattention',
      alt: 'Silver ribbon paths loop through a raised glass chamber on a chip resting on dark stone.',
    },
  ],
  [
    'neural-network-pruning-sparse-inference',
    {
      file: 'fieldnotes-pruning',
      alt: 'An open silver lattice arch stands beside detached metal columns.',
    },
  ],
  [
    'promptable-image-segmentation-masks',
    {
      file: 'fieldnotes-segmentation',
      alt: 'A silver silhouette surrounds a glass pear and its leaf on dark fabric.',
    },
  ],
  [
    'tabular-ai-trees-neural-networks',
    {
      file: 'fieldnotes-tabular',
      alt: 'A branching silver tree and woven metal mesh rise from an ordered grid of graphite blocks.',
    },
  ],
  [
    'differential-privacy-model-training',
    {
      file: 'fieldnotes-privacy',
      alt: 'A frosted glass panel obscures individual silver beads inside a clear circular vessel.',
    },
  ],
  [
    'approximate-nearest-neighbor-vector-search',
    {
      file: 'fieldnotes-vector-search',
      alt: 'A bright path descends through a layered network of silver spheres toward a small cluster.',
    },
  ],
  [
    'test-time-adaptation-distribution-shift',
    {
      file: 'fieldnotes-adaptation',
      alt: 'A silver camera lens on a gimbal faces a curtain of frosted glass droplets.',
    },
  ],
  [
    'multi-task-learning-negative-transfer',
    {
      file: 'fieldnotes-multitask',
      alt: 'Three metal forms share a woven silver trunk with tension cables extending to separate anchors.',
    },
  ],
  [
    'self-supervised-audio-representations',
    {
      file: 'horizon-audio-features',
      alt: 'A waveform of silver reeds passes through a glass ear and becomes suspended crystalline blocks.',
    },
  ],
  [
    'neural-image-compression-rate-distortion',
    {
      file: 'horizon-neural-codecs',
      alt: 'A silver mountain relief curls into a glass capsule on a dark museum table.',
    },
  ],
  [
    'causal-machine-learning-interventions',
    {
      file: 'horizon-causality',
      alt: 'Two silver pendulums hang from one beam while a mechanical arm touches one sphere.',
    },
  ],
  [
    'model-confidence-calibration-decisions',
    {
      file: 'horizon-calibration',
      alt: 'Glass vessels hold different quantities of silver beads beside an unmarked balance scale.',
    },
  ],
  [
    'video-understanding-temporal-evidence',
    {
      file: 'horizon-video-understanding',
      alt: 'Glass frames show a silver sphere moving behind a dark arch, with a gap in the sequence.',
    },
  ],
  [
    'data-augmentation-label-preserving-transformations',
    {
      file: 'horizon-augmentation',
      alt: 'A silver leaf appears through angled glass panes with differing reflections and perspectives.',
    },
  ],
  [
    'neuro-symbolic-ai-constraints-and-solvers',
    {
      file: 'horizon-symbolic',
      alt: 'A flowing silver ribbon joins a precisely fitted puzzle of stone and glass blocks.',
    },
  ],
  [
    'neural-network-optimizers-learning-rates',
    {
      file: 'horizon-optimizers',
      alt: 'Silver tracks cross dark sculpted terrain toward a shallow illuminated basin.',
    },
  ],
  [
    'transformer-attention-contextual-representations',
    {
      file: 'horizon-attention',
      alt: 'Silver threads pass through a glass prism and suspended panes before forming a woven knot.',
    },
  ],
  [
    'encoder-decoder-masked-causal-language-models',
    {
      file: 'horizon-encoders',
      alt: 'A circular silver frame holds a translucent landscape scroll beside a metal pen and flowing ribbon.',
    },
  ],
  [
    'contrastive-learning-positive-negative-pairs',
    {
      file: 'horizon-contrastive',
      alt: 'Paired faceted stones connect with silver filaments, with a separate pair beyond a glass divider.',
    },
  ],
  [
    'diffusion-language-models-parallel-generation',
    {
      file: 'horizon-text-diffusion',
      alt: 'Floating frosted tiles transform into sharply folded silver forms across a dark mosaic.',
    },
  ],
  [
    'verifiable-rewards-reasoning-model-training',
    {
      file: 'horizon-verifiable-rewards',
      alt: 'A polished metal marble approaches a clear glass gate inside a curved silver maze.',
    },
  ],
  [
    'reward-hacking-ai-objectives',
    {
      file: 'horizon-reward-hacking',
      alt: 'A small mechanical climber scales the outside of a silver maze toward a luminous sphere.',
    },
  ],
  [
    'computer-use-agents-screens-actions-recovery',
    {
      file: 'horizon-computer-agents',
      alt: 'An articulated metal pointer faces a blank glass panel on a curved mechanical rail.',
    },
  ],
  [
    'ai-search-citations-evidence-trails',
    {
      file: 'horizon-citations',
      alt: 'Fine silver threads connect dark stone books through a magnifying lens to a clear page.',
    },
  ],
  [
    'ocr-document-ai-reading-order',
    {
      file: 'horizon-ocr',
      alt: 'A translucent sheet passes through a silver scanning arch and separates into ordered strips.',
    },
  ],
  [
    'vision-language-action-robotics',
    {
      file: 'horizon-robotics',
      alt: 'A brushed-metal robotic gripper holds a clear cube above a fitted dark tray.',
    },
  ],
  [
    'world-models-simulation-planning',
    {
      file: 'horizon-world-models',
      alt: 'A miniature mountain landscape sits inside a glass sphere beside a fragmented mirror reflection.',
    },
  ],
  [
    'protein-ai-structure-function-evidence',
    {
      file: 'horizon-proteins',
      alt: 'A folded silver ribbon with pearl joints and a frosted loop floats above a laboratory plinth.',
    },
  ],
  [
    'ai-weather-models-forecast-evaluation',
    {
      file: 'horizon-weather',
      alt: 'A dark globe with silver cloud formations and transparent atmospheric rings floats above a rippled sea.',
    },
  ],
  [
    'compute-optimal-training-data-budgets',
    {
      file: 'horizon-scaling',
      alt: 'Three connected silver platforms support a cube, stacked glass sheets, and a coiled spring.',
    },
  ],
  [
    'sparse-autoencoders-model-interpretability',
    {
      file: 'horizon-interpretability',
      alt: 'A dense woven cable separates through a glass prism into fibers with scattered illuminated ends.',
    },
  ],
  [
    'ai-text-watermarks-detection-limits',
    {
      file: 'horizon-watermarks',
      alt: 'A magnifying lens reveals a fine ripple pattern on a blank silver sheet.',
    },
  ],
  [
    'ai-translation-terminology-review',
    {
      file: 'horizon-translation',
      alt: 'Two silver origami birds share a pearl above a transparent bridge between dark rocks.',
    },
  ],
  [
    'active-learning-labeling-budget',
    {
      file: 'horizon-active-learning',
      alt: 'Silver tweezers select a faceted clear stone from a field of smooth graphite pebbles.',
    },
  ],
  [
    'ai-anomaly-detection-alert-quality',
    {
      file: 'horizon-anomalies',
      alt: 'A silver tuning fork stands beside glass discs bearing circular and asymmetric ripples.',
    },
  ],
  [
    'continual-learning-catastrophic-forgetting',
    {
      file: 'horizon-continual',
      alt: 'A silver bonsai with supported metal branches grows a luminous translucent branch.',
    },
  ],
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
