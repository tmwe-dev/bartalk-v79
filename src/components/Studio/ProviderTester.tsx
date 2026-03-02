import { useState } from 'react';
import { AGENTS } from '../../lib/agents';
import { callProxy } from '../../lib/proxy';
import { getAPIKey, getModel } from '../../lib/storage';
import { DEFAULT_MODELS } from '../../lib/constants';
import { formatDuration } from '../../lib/utils';

interface TestResult {
  agentName: string;
  provider: string;
  status: 'pending' | 'success' | 'error' | 'no-key';
  content?: string;
  duration?: number;
  error?: string;
}

export function ProviderTester() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const newResults: TestResult[] = [];

    for (const agent of AGENTS) {
      const apiKey = getAPIKey(agent.provider);
      if (!apiKey) {
        newResults.push({
          agentName: agent.name,
          provider: agent.provider,
          status: 'no-key',
        });
        setResults([...newResults]);
        continue;
      }

      const pending: TestResult = {
        agentName: agent.name,
        provider: agent.provider,
        status: 'pending',
      };
      newResults.push(pending);
      setResults([...newResults]);

      const model = getModel(agent.provider) || DEFAULT_MODELS[agent.provider];
      const start = Date.now();

      try {
        const res = await callProxy({
          provider: agent.provider,
          model,
          messages: [{ role: 'user', content: 'Rispondi con una frase breve: ciao!' }],
          systemPrompt: 'Sei un assistente AI. Rispondi brevemente.',
          apiKey,
        });

        const idx = newResults.length - 1;
        if (res.error) {
          newResults[idx] = { ...pending, status: 'error', error: res.error, duration: Date.now() - start };
        } else {
          newResults[idx] = { ...pending, status: 'success', content: res.content.substring(0, 100), duration: res.duration };
        }
      } catch (err) {
        const idx = newResults.length - 1;
        newResults[idx] = { ...pending, status: 'error', error: (err as Error).message, duration: Date.now() - start };
      }

      setResults([...newResults]);
    }

    setTesting(false);
  };

  return (
    <div className="provider-tester">
      <button className="btn btn-primary" onClick={runTests} disabled={testing}>
        {testing ? 'Test in corso...' : 'Testa tutti i provider'}
      </button>

      {results.length > 0 && (
        <div className="test-results">
          {results.map((r, i) => (
            <div key={i} className={`test-result test-${r.status}`}>
              <span className="test-agent">{r.agentName}</span>
              <span className="test-provider">{r.provider}</span>
              <span className="test-status">
                {r.status === 'pending' && '⏳'}
                {r.status === 'success' && '✅'}
                {r.status === 'error' && '❌'}
                {r.status === 'no-key' && '🔑'}
              </span>
              {r.duration && <span className="test-time">{formatDuration(r.duration)}</span>}
              {r.content && <span className="test-content">{r.content}</span>}
              {r.error && <span className="test-error">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
