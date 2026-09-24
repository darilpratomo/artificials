import { providerLogo } from './catalog.ts';

/**
 * How a model maker is drawn in charts: its brand colour and its logo.
 *
 * Colours are each maker's own brand colour, lifted where needed so a mark
 * keeps at least 3:1 contrast on the dark chart surface (#101115). Several
 * makers share a blue or an orange, exactly as their brands do, so a colour
 * never identifies a maker on its own: every chart pairs the mark with the
 * maker's logo, name or both.
 *
 * Icons are LobeHub marks vendored by scripts/vendor-logos.mjs. A maker's
 * mark can differ from its cloud's: Microsoft makes Phi, Azure hosts it.
 */
export interface MakerStyle {
  color: string;
  icon: string;
}

export const MAKER_STYLES: Record<string, MakerStyle> = {
  openai: { color: '#e4e6eb', icon: 'openai' },
  anthropic: { color: '#d97757', icon: 'anthropic' },
  google: { color: '#4285f4', icon: 'google-color' },
  meta: { color: '#1d7bff', icon: 'meta-color' },
  xai: { color: '#9ea3ad', icon: 'xai' },
  deepseek: { color: '#5b76fe', icon: 'deepseek-color' },
  alibaba: { color: '#ff6a00', icon: 'alibaba-color' },
  moonshotai: { color: '#2f8fff', icon: 'moonshot' },
  zai: { color: '#7b8cff', icon: 'zai' },
  zhipuai: { color: '#7b8cff', icon: 'zhipu-color' },
  minimax: { color: '#e8365d', icon: 'minimax-color' },
  mistral: { color: '#fa520f', icon: 'mistral-color' },
  nvidia: { color: '#76b900', icon: 'nvidia-color' },
  azure: { color: '#00a4ef', icon: 'microsoft-color' },
  'amazon-bedrock': { color: '#ff9900', icon: 'aws-color' },
  cohere: { color: '#ff7759', icon: 'cohere-color' },
  ai21: { color: '#f0508e', icon: 'ai21' },
  perplexity: { color: '#20b8cd', icon: 'perplexity-color' },
  inception: { color: '#9a8cff', icon: 'inception' },
  bytedance: { color: '#5aa0ff', icon: 'bytedance-color' },
  baidu: { color: '#5d67f2', icon: 'baidu-color' },
  tencent: { color: '#3d7bff', icon: 'tencent-color' },
  'black-forest-labs': { color: '#c9ccd4', icon: 'bfl' },
  ibm: { color: '#4589ff', icon: 'ibm' },
  xiaomi: { color: '#ff6900', icon: 'xiaomimimo' },
  stepfun: { color: '#3fcfc0', icon: 'stepfun-color' },
  upstage: { color: '#9b7bff', icon: 'upstage-color' },
  meituan: { color: '#ffc300', icon: 'longcat-color' },
  nousresearch: { color: '#b0b4be', icon: 'nousresearch' },
  stabilityai: { color: '#b77cff', icon: 'stability-color' },
  recraft: { color: '#c9ccd4', icon: 'recraft' },
  ideogram: { color: '#c9ccd4', icon: 'ideogram' },
  kuaishou: { color: '#ff7a3d', icon: 'kling-color' },
  liquid: { color: '#b0b4be', icon: 'liquid' },
  '01ai': { color: '#3fbf8f', icon: 'yi-color' },
  baichuan: { color: '#ff8f3f', icon: 'baichuan-color' },
  internlm: { color: '#4f8cff', icon: 'internlm-color' },
  tii: { color: '#c7a24a', icon: 'tii-color' },
  lg: { color: '#e5467a', icon: 'lg-color' },
  reka: { color: '#b0b4be', icon: 'reka' },
};

/** Marks for makers without a listed colour; also the "Other" key in legends. */
export const OTHER_MAKER_COLOR = '#6b7080';

export function makerColor(id: string): string {
  return Object.hasOwn(MAKER_STYLES, id) ? MAKER_STYLES[id].color : OTHER_MAKER_COLOR;
}

/** The maker's own mark, or the host mark for an id that is also a provider. */
export function makerLogo(id: string): string {
  return Object.hasOwn(MAKER_STYLES, id)
    ? `/providers/brand/${MAKER_STYLES[id].icon}.svg`
    : providerLogo(id);
}
