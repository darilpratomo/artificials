import { useState } from 'react';
import { ArrowRight, FlaskConical, RotateCcw } from 'lucide-react';
import { thresholdFixture, thresholdMetrics } from '../lib/academy';

export function ConceptLab({ type = 'threshold' }: { type?: 'threshold' | 'neuron' }) {
  const [threshold, setThreshold] = useState(0.5);
  const [weight, setWeight] = useState(1.2);
  const [input, setInput] = useState(0.5);
  const [bias, setBias] = useState(0.1);
  const metrics = thresholdMetrics(threshold);
  const activation = 1 / (1 + Math.exp(-(weight * input + bias)));
  return (
    <section
      className="concept-lab"
      aria-label={
        type === 'threshold' ? 'Interactive decision threshold lab' : 'Interactive neuron lab'
      }
    >
      <div className="lab-heading">
        <span className="eyebrow">
          <FlaskConical size={15} /> INTERACTIVE LAB
        </span>
        <span className="mono">RUNS IN YOUR BROWSER</span>
      </div>
      <h3>
        {type === 'threshold'
          ? 'Move the threshold. See the trade-off.'
          : 'One neuron. Three things you control.'}
      </h3>
      <p>
        {type === 'threshold'
          ? 'Six invented predictions, one decision boundary. A higher score is classified as positive when it meets the threshold.'
          : 'A single input passes through a weight and bias, then a sigmoid activation. Adjust the inputs to see the actual calculation.'}
      </p>
      {type === 'threshold' ? (
        <>
          <label className="lab-slider">
            Decision threshold <output>{threshold.toFixed(2)}</output>
            <input
              aria-label="Decision threshold"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <div className="lab-predictions">
            {thresholdFixture.map((row, i) => (
              <div className={row.score >= threshold ? 'predicted-positive' : ''} key={i}>
                <span>{row.score.toFixed(2)}</span>
                <i style={{ height: `${row.score * 80 + 12}px` }} />
                <small>{row.actual ? 'Actual +' : 'Actual −'}</small>
              </div>
            ))}
          </div>
          <div className="lab-results" aria-live="polite">
            <div>
              <span>Precision</span>
              <strong>
                {metrics.precision === null ? 'N/A' : `${Math.round(metrics.precision * 100)}%`}
              </strong>
            </div>
            <div>
              <span>Recall</span>
              <strong>{Math.round(metrics.recall * 100)}%</strong>
            </div>
            <div>
              <span>False alerts</span>
              <strong>{metrics.fp}</strong>
            </div>
            <div>
              <span>Missed positives</span>
              <strong>{metrics.fn}</strong>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="neuron-equation" aria-live="polite">
            <span>
              {input.toFixed(1)} × {weight.toFixed(1)} + {bias.toFixed(1)}
            </span>
            <span className="inline-flow">
              <ArrowRight className="inline-arrow" size={14} aria-hidden="true" />
              sigmoid
              <ArrowRight className="inline-arrow" size={14} aria-hidden="true" />
            </span>
            <strong>{activation.toFixed(3)}</strong>
          </div>
          {[
            { label: 'Input', value: input, set: setInput },
            { label: 'Weight', value: weight, set: setWeight },
            { label: 'Bias', value: bias, set: setBias },
          ].map(({ label, value, set }) => (
            <label className="lab-slider" key={label}>
              {label}
              <output>{value.toFixed(1)}</output>
              <input
                aria-label={label}
                type="range"
                min="-3"
                max="3"
                step="0.1"
                value={value}
                onChange={(e) => set(Number(e.target.value))}
              />
            </label>
          ))}
        </>
      )}
      <div className="lab-footnote">
        <span>
          {type === 'threshold'
            ? 'Synthetic teaching data. Undefined precision is shown as N/A.'
            : 'A mathematical demo; the output is not a calibrated confidence score.'}
        </span>
        <button
          className="text-link"
          onClick={() => {
            setThreshold(0.5);
            setInput(0.5);
            setWeight(1.2);
            setBias(0.1);
          }}
        >
          <RotateCcw size={13} /> Reset lab
        </button>
      </div>
    </section>
  );
}
