/**
 * A readable name for a model the site has no page for, written from the
 * identifier its test publisher used: "gpt-4-0613" reads "GPT-4 0613",
 * "claude-3-5-sonnet-20240620" reads "Claude 3.5 Sonnet 2024-06-20" and
 * "gpt-5.5-pre-release_xhigh" reads "GPT-5.5 Pre-release (xhigh)". Only the
 * spelling changes: no word is added, dropped or guessed. A name already
 * written for people, with spaces, is kept as it is.
 */

/** Words with a set spelling. Anything else gets a capital first letter. */
const WORDS: Record<string, string> = {
  gpt: 'GPT',
  glm: 'GLM',
  chatglm: 'ChatGLM',
  llm: 'LLM',
  llama: 'Llama',
  codellama: 'CodeLlama',
  qwen: 'Qwen',
  qwq: 'QwQ',
  qvq: 'QVQ',
  deepseek: 'DeepSeek',
  minimax: 'MiniMax',
  longcat: 'LongCat',
  olmo: 'OLMo',
  ernie: 'ERNIE',
  nvidia: 'NVIDIA',
  ibm: 'IBM',
  dbrx: 'DBRX',
  mpt: 'MPT',
  palm: 'PaLM',
  stablelm: 'StableLM',
  wizardlm: 'WizardLM',
  internlm: 'InternLM',
  openchat: 'OpenChat',
  openhermes: 'OpenHermes',
  it: 'IT',
  sft: 'SFT',
  dpo: 'DPO',
  orpo: 'ORPO',
  simpo: 'SimPO',
  moe: 'MoE',
  ai: 'AI',
  api: 'API',
  oss: 'OSS',
  vl: 'VL',
  fp4: 'FP4',
  fp8: 'FP8',
  fp16: 'FP16',
  bf16: 'BF16',
  nvfp4: 'NVFP4',
  int4: 'INT4',
  int8: 'INT8',
};
/** Makers whose model names join the version with a hyphen: GPT-4, GLM-4, Phi-3. */
const HYPHENATED = new Set(['GPT', 'GLM', 'Phi']);
/** Prefixes that belong to the next word: "pre-release", "non-thinking". */
const JOINED = new Set(['pre', 'non', 'no', 'multi', 'semi']);

function word(token: string): string {
  const lower = token.toLowerCase();
  if (WORDS[lower]) return WORDS[lower];
  // Sizes and counts: 70b, 8x7b, a22b, 128k.
  if (/^(?:\d+(?:\.\d+)?|\d+x\d+|a\d+(?:\.\d+)?)[bkmt]$/.test(lower))
    return lower.toUpperCase().replace(/X/, 'x');
  // A brand run into its version, such as qwen2.5 or chatglm2.
  const run = /^([a-z]+)(\d[\d.]*)$/.exec(lower);
  if (run && WORDS[run[1]]) return WORDS[run[1]] + run[2];
  // Models named for their series, such as o1 or o3, stay lowercase.
  if (/^o\d$/.test(lower)) return lower;
  // A one-letter series with its version: v4, k2.5, m2.1.
  if (/^[a-z]\d[\d.]*$/.test(lower)) return lower === token ? lower.toUpperCase() : token;
  return /[a-z]/.test(token[0]) ? token[0].toUpperCase() + token.slice(1) : token;
}

export function readableName(raw: string): string {
  if (/\s/.test(raw)) return raw;
  // A Hugging Face style "Org/Model" is the model after the slash.
  let name = raw.split('/').pop() ?? raw;
  // Epoch writes a configuration after the last underscore: "gpt-5_high". An
  // underscore inside a version, as in "internlm2_5-20b", is a dot.
  let configuration = '';
  const underscore = name.lastIndexOf('_');
  if (underscore > 0) {
    const rest = name.slice(underscore + 1);
    if (rest && !rest.includes('-')) {
      configuration = rest;
      name = name.slice(0, underscore);
    }
  }
  // An underscore or a "p" between digits is a decimal point: internlm2_5, kimi-k2p5.
  name = name.replace(/(\d)[_p](\d)/g, '$1.$2');
  const tokens = name.split('-').filter(Boolean);
  const parts: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    // Dates: 20240620, or 2025-02-27 written as three parts.
    const compact = /^(20\d\d)(\d\d)(\d\d)$/.exec(token);
    if (compact) {
      parts.push(`${compact[1]}-${compact[2]}-${compact[3]}`);
      continue;
    }
    if (
      /^20\d\d$/.test(token) &&
      /^\d\d$/.test(next ?? '') &&
      /^\d\d$/.test(tokens[index + 2] ?? '')
    ) {
      parts.push(`${token}-${next}-${tokens[index + 2]}`);
      index += 2;
      continue;
    }
    // Short dates, 26-02-10 or 02-05, stay one date.
    if (/^\d\d$/.test(token) && /^\d\d$/.test(next ?? '')) {
      let date = token;
      while (/^\d\d$/.test(tokens[index + 1] ?? '')) date += `-${tokens[++index]}`;
      parts.push(date);
      continue;
    }
    let formatted: string;
    if (/^\d$/.test(token) && /^\d$/.test(next ?? '')) {
      // A version written with hyphens, as in claude-3-5: single digits in a row.
      formatted = token;
      while (/^\d$/.test(tokens[index + 1] ?? '')) formatted += `.${tokens[++index]}`;
    } else if (JOINED.has(token.toLowerCase()) && next && /^[a-z]/i.test(next)) {
      formatted = `${word(token)}-${next.toLowerCase()}`;
      index += 1;
    } else formatted = word(token);
    const previous = parts.at(-1);
    // GPT-4, GLM-4.5, Phi-3: the version joins the name with a hyphen.
    if (previous && HYPHENATED.has(previous) && /^\d/.test(formatted))
      parts[parts.length - 1] = `${previous}-${formatted}`;
    else parts.push(formatted);
  }
  // A snapshot's date or revision at the end reads as a note, the way the site
  // names dated models: "Claude 3 Opus (2024-02-29)", "Gemini 1.5 Pro (002)".
  const last = parts.at(-1) ?? '';
  const snapshot =
    parts.length > 1 &&
    (/^20\d\d-\d\d-\d\d$/.test(last) ||
      /^\d\d(?:-\d\d){1,2}$/.test(last) ||
      /^00\d$/.test(last) ||
      /^(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/.test(last));
  const readable = snapshot ? `${parts.slice(0, -1).join(' ')} (${last})` : parts.join(' ');
  return configuration ? `${readable} (${configuration})` : readable;
}
