import { useState, type ReactNode } from 'react';
import { LLAMA_405B_GPU_HOURS, duration, trainingDays } from '../../lib/descent-math';
import type { Draw } from './engine';
import { HUE } from './kit';
import type { Step } from './Scene';
import { createAgents } from './scenes/agents';
import { createAssistant } from './scenes/assistant';
import { createAttention } from './scenes/attention';
import { createBeyond } from './scenes/beyond';
import { createBill } from './scenes/bill';
import { createCluster } from './scenes/cluster';
import { createDatacenter } from './scenes/datacenter';
import { EXPERT_MODELS, createExperts } from './scenes/experts';
import { createGpu } from './scenes/gpu';
import { createInference } from './scenes/inference';
import { createInterlude } from './scenes/interlude';
import { createLandscape } from './scenes/landscape';
import { createLimits } from './scenes/limits';
import { createMatmul } from './scenes/matmul';
import { createMeaning } from './scenes/meaning';
import { createMemory } from './scenes/memory';
import { createBackward, createForward } from './scenes/network';
import { createNeuron } from './scenes/neuron';
import { createPredict } from './scenes/predict';
import { createQuantize } from './scenes/quantize';
import { createTokens } from './scenes/tokens';
import { createTower } from './scenes/tower';

/** A link to where a figure comes from. */
export function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export const SOURCES = {
  tokens: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them',
  llama3: 'https://arxiv.org/abs/2407.21783',
  llamaCard: 'https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md',
  llamaBlog: 'https://ai.meta.com/blog/meta-llama-3/',
  word2vec: 'https://arxiv.org/abs/1301.3781',
  transformer: 'https://arxiv.org/abs/1706.03762',
  backprop: 'https://www.nature.com/articles/323533a0',
  gelu: 'https://arxiv.org/abs/1606.08415',
  scaling: 'https://arxiv.org/abs/2001.08361',
  h100: 'https://www.nvidia.com/en-us/data-center/h100/',
  hopper: 'https://resources.nvidia.com/en-us-tensor-core/gtc22-whitepaper-hopper',
  zero: 'https://arxiv.org/abs/1910.02054',
  vit: 'https://arxiv.org/abs/2010.11929',
  ddpm: 'https://arxiv.org/abs/2006.11239',
  sky: 'https://spaceplace.nasa.gov/blue-sky/en/',
  instructgpt: 'https://arxiv.org/abs/2203.02155',
  dpo: 'https://arxiv.org/abs/2305.18290',
  mixtral: 'https://arxiv.org/abs/2401.04088',
  deepseekV3: 'https://arxiv.org/abs/2412.19437',
};

/** Every source the page cites, for the list at its end. */
export const REFERENCES: [href: string, text: string][] = [
  [SOURCES.tokens, 'OpenAI: What are tokens and how to count them?'],
  [
    SOURCES.word2vec,
    'Mikolov et al., 2013: Efficient Estimation of Word Representations in Vector Space',
  ],
  [SOURCES.gelu, 'Hendrycks and Gimpel, 2016: Gaussian Error Linear Units (GELUs)'],
  [SOURCES.transformer, 'Vaswani et al., 2017: Attention Is All You Need'],
  [
    SOURCES.backprop,
    'Rumelhart, Hinton and Williams, 1986: Learning representations by back-propagating errors',
  ],
  [
    SOURCES.instructgpt,
    'Ouyang et al., 2022: Training language models to follow instructions with human feedback',
  ],
  [
    SOURCES.dpo,
    'Rafailov et al., 2023: Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
  ],
  [SOURCES.scaling, 'Kaplan et al., 2020: Scaling Laws for Neural Language Models'],
  [
    SOURCES.zero,
    'Rajbhandari et al., 2019: ZeRO: Memory Optimizations Toward Training Trillion Parameter Models',
  ],
  [SOURCES.llama3, 'Meta, 2024: The Llama 3 Herd of Models'],
  [SOURCES.llamaCard, 'Meta: Llama 3.1 model card'],
  [SOURCES.llamaBlog, 'Meta, 2024: Introducing Meta Llama 3'],
  [SOURCES.mixtral, 'Jiang et al., 2024: Mixtral of Experts'],
  [SOURCES.deepseekV3, 'DeepSeek-AI, 2024: DeepSeek-V3 Technical Report'],
  [SOURCES.h100, 'NVIDIA: H100 Tensor Core GPU specifications'],
  [SOURCES.hopper, 'NVIDIA: Hopper architecture whitepaper'],
  [SOURCES.vit, 'Dosovitskiy et al., 2020: An Image is Worth 16x16 Words'],
  [SOURCES.ddpm, 'Ho, Jain and Abbeel, 2020: Denoising Diffusion Probabilistic Models'],
  [SOURCES.sky, 'NASA Space Place: Why Is the Sky Blue?'],
];

export interface Chapter {
  kind: 'chapter';
  id: string;
  /** The name on the rail. */
  short: string;
  title: string;
  lede: string;
  label: string;
  steps: Step[];
  draw: Draw;
  ambient?: boolean;
  controls?: (set: (key: string, value: number) => void) => ReactNode;
}
export interface Pause {
  kind: 'interlude';
  id: string;
  kicker: string;
  question: string;
  label: string;
  draw: Draw;
  from: string;
  to: string;
}

function Temperature({ set }: { set: (key: string, value: number) => void }) {
  const [value, setValue] = useState(1);
  return (
    <label className="dsc-slider">
      <span>Temperature</span>
      <input
        type="range"
        min={0.2}
        max={2}
        step={0.1}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          setValue(next);
          set('temperature', next);
        }}
      />
      <output>{value.toFixed(1)}</output>
    </label>
  );
}

const MODEL_SIZES = [8, 70, 405];
function ModelSize({ set }: { set: (key: string, value: number) => void }) {
  const [value, setValue] = useState(70);
  return (
    <div className="dsc-segments" role="group" aria-label="Model size">
      {MODEL_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          aria-pressed={value === size}
          onClick={() => {
            setValue(size);
            set('model', size);
          }}
        >
          {size}B
        </button>
      ))}
    </div>
  );
}

/** A number of GPUs on a doubling scale, from one to 16,384. */
function GpuCount({ set }: { set: (key: string, value: number) => void }) {
  const [power, setPower] = useState(14);
  const gpus = 2 ** power;
  return (
    <label className="dsc-slider">
      <span>GPUs</span>
      <input
        type="range"
        min={0}
        max={14}
        step={1}
        value={power}
        aria-valuetext={`${gpus === 1 ? '1 GPU' : `${gpus.toLocaleString('en-US')} GPUs`}: about ${duration(trainingDays(LLAMA_405B_GPU_HOURS, gpus))}`}
        onChange={(event) => {
          const next = Number(event.target.value);
          setPower(next);
          set('gpus', 2 ** next);
        }}
      />
      <output>
        {gpus.toLocaleString('en-US')}: {duration(trainingDays(LLAMA_405B_GPU_HOURS, gpus))}
      </output>
    </label>
  );
}

/** Every chapter and pause, in reading order. */
export function sequence(): (Chapter | Pause)[] {
  return [
    {
      kind: 'chapter',
      id: 'tokens',
      short: 'Tokens',
      title: 'Words become pieces',
      lede: 'A model cannot read letters. First, your question is cut into tokens.',
      label:
        'The question “Why is the sky blue?” cut into six tokens, each looked up as a number, then lined up as a row of numbers.',
      draw: createTokens(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              You type a question: “Why is the sky blue?” To a computer it is a string of
              characters. A language model works with a fixed set of pieces instead, so the first
              job is to find them.
            </p>
          ),
        },
        {
          heading: 'Cut into tokens',
          body: (
            <p>
              A tokenizer splits the text into tokens: common words whole, rarer words in parts,
              punctuation on its own. The space before a word usually travels with it, which is why
              “ sky” and “sky” can be different tokens.
            </p>
          ),
          fact: (
            <>
              In English, one token averages about four characters.{' '}
              <Source href={SOURCES.tokens}>OpenAI</Source>
            </>
          ),
        },
        {
          heading: 'Look each one up',
          body: (
            <p>
              Every token has a number: its place in the model’s vocabulary, a list fixed before
              training begins. Vocabularies hold from tens of thousands to a few hundred thousand
              tokens. The numbers here are illustrative; each tokenizer has its own.
            </p>
          ),
        },
        {
          heading: 'A row of numbers',
          body: (
            <p>
              Your question is now a row of whole numbers. From here on, everything the model does
              to it is arithmetic.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'meaning',
      short: 'Meaning',
      title: 'Numbers with meaning',
      lede: 'Each token becomes a long list of numbers: a point in a space where related words sit close together.',
      label:
        'Six columns of numbers fly into a slowly turning space of words; related words cluster, and arrows show the same step from man to woman as from king to queen.',
      draw: createMeaning(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              A token’s number is only a label. The model swaps each one for a vector: a list of
              numbers it learned during training. Our six tokens become six columns of values.
            </p>
          ),
          fact: (
            <>
              The largest Llama 3 model gives each token 16,384 numbers.{' '}
              <Source href={SOURCES.llama3}>Meta, 2024</Source>
            </>
          ),
        },
        {
          heading: 'A space of meaning',
          body: (
            <p>
              Read as coordinates, each vector is a point. Training arranges the points so that
              words used in similar ways end up near each other. The picture squeezes thousands of
              dimensions into three.
            </p>
          ),
        },
        {
          heading: 'Neighbours',
          body: (
            <p>
              “sky” lands among cloud, air and rain; “blue” among the other colours. Nobody wrote
              those rules down: they come from how words are used across the training text.
            </p>
          ),
        },
        {
          heading: 'Directions mean something too',
          body: (
            <p>
              In a well-known early result, the step from “man” to “woman” matched the step from
              “king” to “queen”. Directions in the space can carry ideas like these. The layout here
              is illustrative.
            </p>
          ),
          fact: (
            <>
              Word vectors: <Source href={SOURCES.word2vec}>Mikolov et al., 2013</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'neuron',
      short: 'Neuron',
      title: 'One artificial neuron',
      lede: 'The basic part is simple: multiply, add, bend.',
      label:
        'Four inputs are multiplied by their weights, added with a bias into 1.12, and bent by an activation curve into an output of 0.97; then the neuron shrinks into a field of many.',
      draw: createNeuron(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              A neuron takes a few numbers in and sends one number out. This one has four inputs.
            </p>
          ),
        },
        {
          heading: 'Weigh each input',
          body: (
            <p>
              Each input is multiplied by a weight. A large weight makes its input count for a lot;
              a negative weight pushes the other way. The weights are what training adjusts.
            </p>
          ),
        },
        {
          heading: 'Add, then bend',
          body: (
            <p>
              The neuron adds the products and a bias, then passes the sum through an activation
              function: a bend that lets a network describe more than straight lines. GELU, drawn
              here, is common in language models.
            </p>
          ),
          fact: (
            <>
              1.32 − 0.20 = 1.12, and GELU(1.12) ≈ 0.97.{' '}
              <Source href={SOURCES.gelu}>Hendrycks and Gimpel, 2016</Source>
            </>
          ),
        },
        {
          heading: 'One of billions',
          body: (
            <p>
              A model is built from enormous numbers of these simple parts. Its parameters, the
              weights and biases, are counted in billions.
            </p>
          ),
          fact: (
            <>
              Llama 3.1’s largest model has 405 billion parameters.{' '}
              <Source href={SOURCES.llamaCard}>Meta</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'layers',
      short: 'Layers',
      title: 'Layer upon layer',
      lede: 'Neurons are arranged in layers, and each layer feeds the next.',
      label:
        'A network of five layers: a wave of light passes from the inputs on the left to the scores on the right, then copies of it stack into the distance.',
      draw: createForward(),
      ambient: true,
      steps: [
        { body: <p>The token vectors enter the first layer.</p> },
        {
          heading: 'A wave through the network',
          body: (
            <p>
              Every neuron in a layer reads the outputs of the layer before, weighs them, adds them
              and bends the sum. The signal sweeps forward, one layer at a time.
            </p>
          ),
        },
        {
          heading: 'Scores come out',
          body: (
            <p>At the far end, the last layer produces the numbers the model will choose from.</p>
          ),
        },
        {
          heading: 'Deep learning',
          body: (
            <p>
              Stacking many layers is what makes a network deep. Language models are much deeper
              than this sketch, and their layers are of a particular kind: transformer blocks.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'attention',
      short: 'Attention',
      title: 'Attention',
      lede: 'Each word looks back at the words before it to work out what it means here.',
      label:
        'Arcs connect the word “blue” to earlier words, strongest to “sky”; three coloured heads follow different patterns; then a triangular grid shows every word’s attention, with the future masked.',
      draw: createAttention(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              On its own, “blue” could be a colour or a mood. To know which, the model lets each
              position gather information from the positions before it.
            </p>
          ),
        },
        {
          heading: 'Weighing the context',
          body: (
            <p>
              “blue” scores every earlier word by how relevant it is, then takes a weighted mix of
              what those words carry. Here it leans most on “sky”.
            </p>
          ),
        },
        {
          heading: 'Many heads',
          body: (
            <p>
              An attention layer runs several of these side by side, each with its own weights. One
              head may follow what is being described, another the word just before, another the
              question being asked.
            </p>
          ),
        },
        {
          heading: 'The pattern',
          body: (
            <p>
              As a grid, each row is one position’s attention, adding up to one. The upper half is
              empty: in a language model a word can look back, never ahead.
            </p>
          ),
          fact: (
            <>
              Attention is the heart of the transformer.{' '}
              <Source href={SOURCES.transformer}>Vaswani et al., 2017</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'transformer',
      short: 'Transformer',
      title: 'The transformer',
      lede: 'The same block, repeated: attention, then a small network, over and over.',
      label:
        'An isometric block with attention below and feed-forward above; ten blocks stack into a tower, a pulse climbs the stream through its centre, and scores fan out of the top.',
      draw: createTower(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              A transformer block has two parts. Attention lets positions exchange information; a
              feed-forward network then works on each position by itself.
            </p>
          ),
        },
        {
          heading: 'Stacked',
          body: <p>Blocks are stacked, each refining what the block below produced.</p>,
        },
        {
          heading: 'The residual stream',
          body: (
            <p>
              Through the middle runs a stream of numbers for every position. Each block reads from
              it and adds its own contribution back, so information climbs without being lost.
            </p>
          ),
        },
        {
          heading: 'Out of the top',
          body: (
            <p>
              After the last block, the stream at the final position becomes a score for every token
              in the vocabulary.
            </p>
          ),
          fact: (
            <>
              Llama 3.1 405B stacks 126 of these blocks.{' '}
              <Source href={SOURCES.llama3}>Meta, 2024</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'prediction',
      short: 'Prediction',
      title: 'One token at a time',
      lede: 'A model does not write an answer. It picks one token, then the next.',
      label:
        'A spectrum of scores narrows to eight candidate first words with their probabilities; a draw picks “Air”, and the answer “Air molecules scatter blue light more than red.” is written one token at a time.',
      draw: createPredict(),
      ambient: true,
      controls: (set) => <Temperature set={set} />,
      steps: [
        {
          body: (
            <p>
              The tower gives a score to every token in the vocabulary: tens of thousands of
              numbers.
            </p>
          ),
        },
        {
          heading: 'Scores into chances',
          body: (
            <p>
              Softmax turns the scores into probabilities that add up to one. Temperature sets how
              bold the choice is: low temperature sharpens the top candidates, high temperature
              evens them out. Try the slider.
            </p>
          ),
        },
        {
          heading: 'Draw one',
          body: (
            <p>
              A token is drawn at random, weighted by those probabilities. Usually a likely token
              wins; sometimes a less likely one does, which is why the same question can get
              different answers.
            </p>
          ),
        },
        {
          heading: 'And again',
          body: (
            <p>
              The chosen token joins the text, and the whole model runs again to choose the next.
              The answer grows a token at a time until the model chooses to stop.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-learning',
      kicker: 'Part two: learning',
      question: 'But where do all those weights come from?',
      label: 'Light falling through the dark, turning from blue to green.',
      draw: createInterlude(HUE.blue, HUE.green, 2),
      from: HUE.blue,
      to: HUE.green,
    },
    {
      kind: 'chapter',
      id: 'training',
      short: 'Training',
      title: 'Learning by going downhill',
      lede: 'Training adjusts the weights, a little at a time, to make fewer mistakes.',
      label:
        'A turning landscape of hills and valleys; arrows show the gradient uphill and the step downhill, and a glowing ball walks down into the lowest valley while its loss falls in a small chart.',
      draw: createLandscape(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Training begins with random weights, so the model’s predictions are poor. Loss
              measures how poor; here, it is the height of the landscape.
            </p>
          ),
        },
        {
          heading: 'Which way is down?',
          body: (
            <p>
              For every weight, calculus gives the gradient: the direction in which the loss rises
              fastest. Training takes a small step the opposite way.
            </p>
          ),
        },
        {
          heading: 'Step after step',
          body: (
            <p>
              Repeating the step walks the weights downhill. Not every walk ends in the deepest
              valley: this one does, while a second walker settles in a shallow dip.
            </p>
          ),
        },
        {
          heading: 'At scale',
          body: (
            <p>
              A real model walks through billions of dimensions at once, not two, one batch of
              training text after another.
            </p>
          ),
          fact: (
            <>
              Llama 3 was pretrained on more than 15 trillion tokens.{' '}
              <Source href={SOURCES.llamaBlog}>Meta</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'backprop',
      short: 'Backpropagation',
      title: 'Blame, passed backwards',
      lede: 'Backpropagation works out how much each weight contributed to the error.',
      label:
        'The network’s outputs are compared with the right answer; a red wave of error flows backwards through every link, and forward and backward passes then alternate.',
      draw: createBackward(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              The model’s prediction is compared with the right answer: the token that really came
              next in the training text.
            </p>
          ),
        },
        {
          heading: 'The error flows back',
          body: (
            <p>
              Starting at the output, the error is passed backwards through the network, layer by
              layer, with the chain rule of calculus.
            </p>
          ),
        },
        {
          heading: 'Every weight moves',
          body: (
            <p>
              Each weight receives its share of the blame and moves a little in the direction that
              would have made the error smaller.
            </p>
          ),
        },
        {
          heading: 'Forward, backward, repeat',
          body: <p>Training alternates the two passes, again and again, across all its text.</p>,
          fact: (
            <>
              Backpropagation:{' '}
              <Source href={SOURCES.backprop}>Rumelhart, Hinton and Williams, 1986</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'assistant',
      short: 'Assistant',
      title: 'From predictor to assistant',
      lede: 'Training on web text makes a model that continues text. A second stage teaches it to answer.',
      label:
        'A base model carries the question on with more questions; people’s example answers flow into the model; a person picks the better of two answers while a reward model scores them; the tuned model then answers the question.',
      draw: createAssistant(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              A model trained only to predict the next token of web text is a base model. Asked a
              question, it may simply carry on the page: more questions, a list, a heading.
            </p>
          ),
        },
        {
          heading: 'Shown good answers',
          body: (
            <p>
              People write example answers to many prompts, and the model is trained on them the
              same way as before, one token at a time. This is supervised fine-tuning.
            </p>
          ),
        },
        {
          heading: 'Asked which is better',
          body: (
            <p>
              The model writes several answers and people rank them. A second model, the reward
              model, learns to predict which answers people prefer.
            </p>
          ),
        },
        {
          heading: 'Nudged towards preferred answers',
          body: (
            <p>
              Reinforcement learning then adjusts the model to earn higher scores from the reward
              model. Newer methods, such as direct preference optimisation, learn from the rankings
              without a separate reward model.
            </p>
          ),
          fact: (
            <>
              People preferred answers from a 1.3-billion-parameter tuned model to those of the
              175-billion-parameter GPT-3:{' '}
              <Source href={SOURCES.instructgpt}>Ouyang et al., 2022</Source>. Direct preference
              optimisation: <Source href={SOURCES.dpo}>Rafailov et al., 2023</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-hardware',
      kicker: 'Part three: hardware',
      question: 'All of it is arithmetic. An astonishing amount of it.',
      label: 'Light falling through the dark, turning from green to amber.',
      draw: createInterlude(HUE.green, HUE.amber, 3),
      from: HUE.green,
      to: HUE.amber,
    },
    {
      kind: 'chapter',
      id: 'matrices',
      short: 'Matrices',
      title: 'It is all multiplication',
      lede: 'Under every layer is one operation, repeated enormously: matrix multiplication.',
      label:
        'Two small matrices of numbers: the first output cell is worked out pair by pair, the other twelve all at once, and then the matrices grow to a real layer’s size.',
      draw: createMatmul(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Most of a layer’s work is one calculation: a matrix of inputs multiplied by a matrix
              of weights.
            </p>
          ),
        },
        {
          heading: 'One cell at a time',
          body: (
            <p>
              Each output cell pairs a row of inputs with a column of weights, multiplies them pair
              by pair and adds the results. The first cell here takes six multiplications.
            </p>
          ),
        },
        {
          heading: 'Every cell at once',
          body: (
            <p>
              No cell depends on another, so they can all be worked out at the same moment. Hardware
              for AI is built around that independence.
            </p>
          ),
        },
        {
          heading: 'At real size',
          body: (
            <p>
              A real layer multiplies matrices with thousands of rows and columns. Writing one token
              takes roughly two operations for every parameter in the model.
            </p>
          ),
          fact: (
            <>
              For a 70-billion-parameter model, that is about 140 billion operations per token.{' '}
              <Source href={SOURCES.scaling}>Kaplan et al., 2020</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'gpus',
      short: 'GPUs',
      title: 'Why graphics chips',
      lede: 'A job made of billions of identical sums needs many hands, not a few clever ones.',
      label:
        'A CPU with eight large cores works through a job slowly while a GPU with hundreds of small cores lights up and finishes it at once; then a tensor core multiplies two small matrices in one step, shown as a cube of 64 products.',
      draw: createGpu(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              A CPU has a handful of powerful cores, built to race through complicated tasks one
              after another.
            </p>
          ),
        },
        {
          heading: 'A few at a time',
          body: (
            <p>Given thousands of independent sums, a CPU works through them a few at a time.</p>
          ),
        },
        {
          heading: 'Thousands at once',
          body: (
            <p>
              A GPU has thousands of simpler cores that run the same instruction on different
              numbers at once. Designed to colour the pixels of games, the idea suits neural
              networks just as well.
            </p>
          ),
        },
        {
          heading: 'Tensor cores',
          body: (
            <p>
              Modern GPUs add tensor cores: units that multiply small matrices in a single step,
              usually at reduced precision.
            </p>
          ),
          fact: (
            <>
              An NVIDIA H100 (SXM) has 16,896 CUDA cores and 528 Tensor Cores.{' '}
              <Source href={SOURCES.hopper}>NVIDIA</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'memory',
      short: 'Memory',
      title: 'The real bottleneck',
      lede: 'Arithmetic is fast. Fetching the numbers to do it on is slow.',
      label:
        'A GPU seen from above: 132 compute units in the middle and six memory stacks at the sides, with data streaming in; the compute mostly waits until many requests share each read.',
      draw: createMemory(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Around the compute die sit stacks of high-bandwidth memory, HBM, which hold the
              model’s weights.
            </p>
          ),
        },
        {
          heading: 'Every weight, every token',
          body: (
            <p>
              To write one token, the chip reads every weight from memory. While the data streams
              in, the arithmetic units mostly wait.
            </p>
          ),
        },
        {
          heading: 'The arithmetic of waiting',
          body: (
            <p>
              A 70-billion-parameter model at 16 bits is 140 GB. At 3.35 TB/s, one full read takes
              about 42 thousandths of a second, which caps a single conversation near 24 tokens a
              second, even if it fitted on one chip.
            </p>
          ),
          fact: (
            <>
              H100 (SXM): 80 GB of HBM3 at 3.35 TB/s. <Source href={SOURCES.h100}>NVIDIA</Source>
            </>
          ),
        },
        {
          heading: 'Share each read',
          body: (
            <p>
              Serving many requests together lets each read of the weights do many people’s work.
              That is why AI services batch requests.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-scale',
      kicker: 'Part four: scale',
      question: 'One GPU is not enough. Not even close.',
      label: 'Light falling through the dark, turning from amber to red.',
      draw: createInterlude(HUE.amber, HUE.red, 4),
      from: HUE.amber,
      to: HUE.red,
    },
    {
      kind: 'chapter',
      id: 'many-gpus',
      short: 'Many GPUs',
      title: 'Why so many GPUs',
      lede: 'Large models outgrow one GPU’s memory, and training needs far more still.',
      label:
        'A block of weights too tall for one GPU’s memory splits across several; bars show the bytes training needs per parameter and a grid of GPUs fills; then eight GPUs in a ring pass gradients around.',
      draw: createCluster(),
      ambient: true,
      controls: (set) => <ModelSize set={set} />,
      steps: [
        {
          body: (
            <p>
              A 70-billion-parameter model at 16 bits needs 140 GB for its weights alone. One GPU
              holds 80 GB. Try the other sizes below the picture.
            </p>
          ),
        },
        {
          heading: 'Split it',
          body: (
            <p>
              So the model is split across GPUs. Each holds a slice of every layer, and they trade
              results over fast links after each one.
            </p>
          ),
        },
        {
          heading: 'Training needs more',
          body: (
            <p>
              Training also keeps gradients and optimizer state: about 16 bytes per parameter with
              the common Adam optimizer, before counting the activations.
            </p>
          ),
          fact: (
            <>
              16 bytes per parameter for mixed-precision Adam.{' '}
              <Source href={SOURCES.zero}>Rajbhandari et al., 2019</Source>
            </>
          ),
        },
        {
          heading: 'Keep in step',
          body: (
            <p>
              To learn from more text at once, copies of the model train on different batches, then
              combine their gradients so every copy takes the same step.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'compute',
      short: 'Compute',
      title: 'The training bill',
      lede: 'Large models take millions of GPU hours. The only way through is many GPUs at once.',
      label:
        'A count rises to 30.84 million GPU hours; a grid of 16,384 dots, one per GPU, lights up one dot and then all of them, and finally glows with the power they draw.',
      draw: createBill(),
      ambient: true,
      controls: (set) => <GpuCount set={set} />,
      steps: [
        {
          body: (
            <p>
              Meta reports that training its largest Llama 3.1 model took 30.84 million GPU hours.
            </p>
          ),
          fact: (
            <>
              Llama 3.1 405B: 30.84M H100 GPU hours. <Source href={SOURCES.llamaCard}>Meta</Source>
            </>
          ),
        },
        {
          heading: 'On one GPU',
          body: <p>Done on a single GPU, that would take about 3,500 years.</p>,
        },
        {
          heading: 'On sixteen thousand',
          body: (
            <p>
              Meta trained it on up to 16,384 GPUs at once. Divided perfectly, that is about eleven
              weeks; real training also loses time to failures and waiting. Move the slider to see
              other counts.
            </p>
          ),
          fact: (
            <>
              Up to 16,384 H100 GPUs. <Source href={SOURCES.llama3}>Meta, 2024</Source>
            </>
          ),
        },
        {
          heading: 'And the power',
          body: (
            <p>
              Each of those GPUs can draw up to 700 watts: together about 11.5 megawatts, before
              cooling, networking and the rest of the building.
            </p>
          ),
          fact: (
            <>
              H100 (SXM): up to 700 W. <Source href={SOURCES.h100}>NVIDIA</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'experts',
      short: 'Experts',
      title: 'A team of experts',
      lede: 'Some of the largest models use only a small part of themselves for each token.',
      label:
        'A token passes through one large block; the block splits into eight experts behind a router that sends each token to two of them; each word of the question takes its own pair; then bars compare all parameters with those used for each token in Mixtral 8x7B and DeepSeek-V3.',
      draw: createExperts(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              In the transformer, every token passes through every weight of each feed-forward
              block. A bigger block means more arithmetic for every token.
            </p>
          ),
        },
        {
          heading: 'A router picks',
          body: (
            <p>
              A mixture-of-experts layer splits that block into several smaller ones, the experts,
              and adds a small router. For each token the router scores the experts and sends the
              token to the best few, blending their answers. Mixtral uses eight experts in each
              layer and picks two.
            </p>
          ),
          fact: (
            <>
              Mixtral: <Source href={SOURCES.mixtral}>Jiang et al., 2024</Source>
            </>
          ),
        },
        {
          heading: 'Each token, its own pair',
          body: (
            <p>
              Different tokens take different experts; the router learns its choices during
              training. They are not tidy subjects: in Mixtral, experts did not split by topic, and
              the patterns found were closer to grammar.
            </p>
          ),
        },
        {
          heading: 'All in memory, a few at work',
          body: (
            <p>
              Every expert must still sit in GPU memory, but each token only does the arithmetic of
              the ones it visits. A model can hold far more than it uses on any one token.
            </p>
          ),
          fact: (
            <>
              {EXPERT_MODELS.map(
                ({ name, total, active }) =>
                  `${name}: ${total}B parameters, ${active}B used for each token`,
              ).join('. ')}
              . <Source href={SOURCES.mixtral}>Mixtral</Source>,{' '}
              <Source href={SOURCES.deepseekV3}>DeepSeek-V3</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'data-centre',
      short: 'Data centre',
      title: 'Inside the data centre',
      lede: 'Zoom out, from one chip to the building it lives in.',
      label:
        'A zoom out: one GPU chip, then a server board of eight linked GPUs, then rows of racks tied into a network, then a whole hall with cold air flowing in and hot air flowing out.',
      draw: createDatacenter(),
      ambient: true,
      steps: [
        { body: <p>One GPU: a compute die, with memory stacked beside it.</p> },
        {
          heading: 'A server',
          body: (
            <p>
              Eight GPUs share a server, joined by fast links, such as NVIDIA’s NVLink, so that they
              can work almost as one.
            </p>
          ),
        },
        {
          heading: 'Racks and networks',
          body: (
            <p>
              Servers fill racks, and racks are wired together by a network that carries results and
              gradients between thousands of GPUs.
            </p>
          ),
        },
        {
          heading: 'Power in, heat out',
          body: (
            <p>
              Almost all the electricity a data centre uses ends up as heat. Cold air or liquid
              flows in, hot air or liquid flows out, around the clock.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-answer',
      kicker: 'Part five: back to you',
      question: 'Now, back up to your question.',
      label: 'Light rising through the dark, turning from red back to blue.',
      draw: createInterlude(HUE.red, HUE.blue, 5),
      from: HUE.red,
      to: HUE.blue,
    },
    {
      kind: 'chapter',
      id: 'serving',
      short: 'Serving',
      title: 'Serving your question',
      lede: 'When you press Enter, your question joins many others on a GPU somewhere.',
      label:
        'A timeline: the six prompt tokens are read in one pass, then the answer is written one token per step while a KV cache of keys and values grows; then four requests interleave on one GPU.',
      draw: createInference(),
      ambient: true,
      steps: [
        { body: <p>Your question arrives as tokens.</p> },
        {
          heading: 'Prefill',
          body: (
            <p>
              The model reads the whole prompt in one pass, every position in parallel. This is the
              pause before the first word appears.
            </p>
          ),
        },
        {
          heading: 'Decode',
          body: (
            <p>
              Then it writes one token per step. Each step reuses what earlier tokens left in the KV
              cache, so nothing is computed twice, and the cache grows with the conversation.
            </p>
          ),
        },
        {
          heading: 'Many at once',
          body: (
            <p>
              A server interleaves many conversations and adds new ones as others finish, so every
              read of the weights serves as many people as it can.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'precision',
      short: 'Precision',
      title: 'Smaller numbers',
      lede: 'Store each weight in fewer bits, and the model shrinks, at a small cost in accuracy.',
      label:
        'The weight 0.707107 as a row of bits: they fall away from 32 to 16, 8 and 4, the values it can take thin out on a number line, and a 70-billion-parameter model shrinks from 280 GB to 35 GB.',
      draw: createQuantize(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Training usually keeps a 32-bit copy of every weight: precise, and large. For a
              70-billion-parameter model, 280 GB.
            </p>
          ),
        },
        {
          heading: '16 bits',
          body: (
            <p>Most models run in 16 bits. Here the weight moves by less than a ten-thousandth.</p>
          ),
        },
        {
          heading: '8 bits',
          body: (
            <p>
              At 8 bits, the values a weight can take thin out. This one lands about 0.02 away, and
              the model halves again.
            </p>
          ),
        },
        {
          heading: '4 bits',
          body: (
            <p>
              At 4 bits, sixteen levels times a shared scale stand in for every weight. The model
              fits in 35 GB, on one GPU, at some cost in quality.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'images',
      short: 'Images',
      title: 'Beyond words',
      lede: 'The same ideas read pictures, and draw them.',
      label:
        'An evening landscape is cut into forty patches that fly down into a row of tokens; then the same picture emerges from noise over fifty denoising steps.',
      draw: createBeyond(),
      steps: [
        { body: <p>Vision models cut an image into patches: small squares of pixels.</p> },
        {
          heading: 'Patches as tokens',
          body: (
            <p>Each patch becomes a vector, like a word, and a transformer reads them together.</p>
          ),
          fact: (
            <>
              “An image is worth 16×16 words.”{' '}
              <Source href={SOURCES.vit}>Dosovitskiy et al., 2020</Source>
            </>
          ),
        },
        {
          heading: 'Drawing from noise',
          body: (
            <p>
              Image generators work the other way round. Training teaches a model to remove a little
              noise from pictures, one step at a time.
            </p>
          ),
        },
        {
          heading: 'Step by step',
          body: (
            <p>
              To draw, it starts from pure noise and removes it step after step, guided by your
              words, until a picture is left. The steps shown are one picture’s noised versions,
              played backwards.
            </p>
          ),
          fact: (
            <>
              Diffusion models: <Source href={SOURCES.ddpm}>Ho, Jain and Abbeel, 2020</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'agents',
      short: 'Agents',
      title: 'Models that use tools',
      lede: 'Given tools, a model can look things up and act, not only write.',
      label:
        'Your question travels to the model; the model sends a search request through a permission gate to a search tool, the result returns into its context, and the answer travels back with its source.',
      draw: createAgents(),
      ambient: true,
      steps: [
        { body: <p>Your question reaches the model.</p> },
        {
          heading: 'Calling a tool',
          body: (
            <p>
              When it lacks something, the model can write a request for a tool, such as a search,
              instead of an answer. The software around it decides whether that call is allowed.
            </p>
          ),
        },
        {
          heading: 'Results join the context',
          body: (
            <p>
              The tool’s result is added to the model’s context, the same way your question was.
            </p>
          ),
        },
        {
          heading: 'An answer, with its source',
          body: (
            <p>
              With the result in view, the model writes its answer, and can point to where it came
              from.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'judgment',
      short: 'Judgment',
      title: 'What it is not',
      lede: 'A model predicts likely words. Likely is not the same as true.',
      label:
        'A confident sentence claims the sky is blue because it reflects the ocean, each word with a high probability bar; a NASA source card slides in, the wrong words are struck through, and three questions to ask are ticked.',
      draw: createLimits(),
      ambient: true,
      steps: [
        { body: <p>An answer can read fluently and confidently.</p> },
        {
          heading: 'Likely, not true',
          body: (
            <p>
              Each token was chosen because it was likely in context. Nothing in that process checks
              the claim against the world.
            </p>
          ),
        },
        {
          heading: 'Check a source',
          body: (
            <p>
              A reliable source settles it: sunlight scatters off the gases in the air, and blue
              light scatters more than red.
            </p>
          ),
          fact: (
            <>
              Why is the sky blue? <Source href={SOURCES.sky}>NASA Space Place</Source>
            </>
          ),
        },
        {
          heading: 'The last check is yours',
          body: (
            <p>
              Tools and sources help, but judgment stays with the reader. Ask where a claim comes
              from before you rely on it.
            </p>
          ),
        },
      ],
    },
  ];
}
