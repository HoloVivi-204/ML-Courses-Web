import { Binary, Sigma } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function calculateDecision(inputOne: number, inputTwo: number) {
  const score = 0.7 * inputOne + 0.7 * inputTwo - 1;

  return {
    output: score >= 0 ? 1 : 0,
    score,
  };
}

interface NeuronDecisionLabProps {
  activityId: string;
}

export function NeuronDecisionLab({ activityId }: NeuronDecisionLabProps) {
  const { t } = useTranslation();
  const [inputOne, setInputOne] = useState(0);
  const [inputTwo, setInputTwo] = useState(0);
  const decision = calculateDecision(inputOne, inputTwo);
  const formula = `0.7 × ${inputOne} + 0.7 × ${inputTwo} − 1.0 = ${decision.score.toFixed(1)}`;

  return (
    <section className="neuron-lab" aria-labelledby="neuron-lab-title">
      <header className="neuron-lab-header">
        <div>
          <span className="eyebrow">{t('trial.lab.eyebrow')}</span>
          <h2 id="neuron-lab-title">{t('trial.lab.title')}</h2>
        </div>
        <span className="lab-activity-id">{activityId}</span>
      </header>

      <div className="neuron-lab-workspace">
        <div className="neuron-inputs">
          <span className="lab-column-label">{t('trial.lab.inputs')}</span>
          <button
            aria-label={t('trial.lab.inputLabel', { input: 'x1', value: inputOne })}
            className={inputOne ? 'neuron-input is-on' : 'neuron-input'}
            onClick={() => setInputOne((value) => (value ? 0 : 1))}
            type="button"
          >
            <span>x₁</span>
            <strong>{inputOne}</strong>
          </button>
          <button
            aria-label={t('trial.lab.inputLabel', { input: 'x2', value: inputTwo })}
            className={inputTwo ? 'neuron-input is-on' : 'neuron-input'}
            onClick={() => setInputTwo((value) => (value ? 0 : 1))}
            type="button"
          >
            <span>x₂</span>
            <strong>{inputTwo}</strong>
          </button>
        </div>

        <div className="neuron-signal-map" aria-hidden="true">
          <i className={inputOne ? 'signal-line line-top is-on' : 'signal-line line-top'} />
          <i className={inputTwo ? 'signal-line line-bottom is-on' : 'signal-line line-bottom'} />
          <div className={decision.output ? 'neuron-core is-on' : 'neuron-core'}>
            <Sigma size={30} />
            <small>step(z)</small>
          </div>
          <i className={decision.output ? 'output-line is-on' : 'output-line'} />
        </div>

        <div className="neuron-output">
          <span className="lab-column-label">{t('trial.lab.output')}</span>
          <div className={decision.output ? 'output-node is-on' : 'output-node'}>
            <Binary aria-hidden="true" size={19} />
            <strong>{decision.output}</strong>
          </div>
        </div>
      </div>

      <div className="neuron-equation">
        <span>{t('trial.lab.weightedSum')}</span>
        <code>{formula}</code>
      </div>

      <p className={decision.output ? 'neuron-verdict is-on' : 'neuron-verdict'} role="status">
        {t(decision.output ? 'trial.lab.active' : 'trial.lab.inactive', {
          output: decision.output,
        })}
      </p>
    </section>
  );
}
