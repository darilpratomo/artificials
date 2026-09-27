/** A deterministic timeline: a frame is a function of scroll position, never elapsed time. */
export const SIGNAL_STEPS = [
  {
    name: 'The question',
    title: 'It starts with\nyour curiosity.',
    text: '“Why does the Moon shine?” To you, it is a question about the night sky. To a language model, it begins as a sequence of symbols. Follow this one question all the way through.',
    detail: 'Scroll down to advance. Scroll up to rewind the same process.',
    label: 'INPUT / TEXT',
  },
  {
    name: 'Tokenization',
    title: 'One sentence.\nSmaller pieces.',
    text: '“Why”, “does”, “the”, “Moon”, “shine”, “?” separate. A tokenizer maps pieces to vocabulary IDs. Real tokenizers may split these words further.',
    detail: 'The meaning is not solved here. We are changing the representation.',
    label: 'ENCODE / TOKENS',
  },
  {
    name: 'Embedding',
    title: 'Words acquire\ndimensions.',
    text: '“Moon” is now a learned vector: a list of numbers. The other pieces get vectors too. Position information helps distinguish their order.',
    detail: 'The displayed dimensions are illustrative, not extracted model activations.',
    label: 'REPRESENT / VECTORS',
  },
  {
    name: 'Attention',
    title: 'Context makes\nconnections.',
    text: 'At the final prompt position, attention mixes information from the available context. Query–key comparisons determine weights; values carry information.',
    detail: 'The connections are a teaching illustration, not a trace of hidden reasoning.',
    label: 'CONNECT / ATTENTION',
  },
  {
    name: 'Transformation',
    title: 'Layer by layer,\nthe signal changes.',
    text: 'Repeated attention and feed-forward blocks update the representations, alongside residual connections and normalization. This stack symbolizes that computation.',
    detail:
      'The five planes are illustrative. Inference uses learned weights; it does not retrain the model.',
    label: 'TRANSFORM / LAYERS',
  },
  {
    name: 'Prediction',
    title: 'Many possibilities.\nOne next token.',
    text: 'Scores become a distribution over possible next tokens. A decoding policy chooses one. In this invented four-candidate example, it chooses “The.”',
    detail:
      'These percentages illustrate a distribution. They are not confidence that an answer is true.',
    label: 'PREDICT / DISTRIBUTION',
  },
  {
    name: 'Generation',
    title: 'The answer\nbuilds on itself.',
    text: '“The” joins the context. Another token follows, then another. The model repeats the loop. Our authored answer becomes: “The Moon shines because it reflects sunlight.”',
    detail:
      'Many small prediction steps can produce a fluent sentence. Fluency alone does not establish correctness.',
    label: 'DECODE / REPEAT',
  },
  {
    name: 'Verification',
    title: 'An answer needs\na reality check.',
    text: 'NASA explains that moonlight is reflected sunlight. A person or a retrieval-enabled application can check the answer against that evidence.',
    detail:
      'This check is not automatic in every model. Prediction and verification are different steps.',
    label: 'VERIFY / EVIDENCE',
  },
] as const;

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
export const segment = (value: number, start: number, end: number) =>
  smooth((value - start) / (end - start));

export function signalFrame(progress: number) {
  const position = clamp01(progress) * (SIGNAL_STEPS.length - 1);
  const from = Math.floor(position);
  return {
    position,
    from,
    to: Math.min(from + 1, SIGNAL_STEPS.length - 1),
    blend: smooth(position - from),
    step: Math.round(position),
  };
}

export function scrollProgress(top: number, trackHeight: number, pinHeight: number, inset: number) {
  return clamp01((inset - top) / Math.max(1, trackHeight - pinHeight));
}
