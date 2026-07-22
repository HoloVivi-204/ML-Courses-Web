import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFetchLearningApiClient } from './learning-api';

describe('fetch learning API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('patches an owner saved Playground config with a name and current parameters', async () => {
    const updatedConfig = {
      configId: 'config-pg-xor-01',
      name: 'Renamed XOR baseline',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.3,
        epochs: 150,
        trainRatio: 0.85,
        seed: 9,
      },
      compatibilityStatus: 'compatible',
      compatibilityReason: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            config: updatedConfig,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createFetchLearningApiClient();
    const result = await client.updatePlaygroundConfig({
      idToken: 'local-id-token',
      configId: 'config-pg-xor-01',
      name: 'Renamed XOR baseline',
      config: {
        learningRate: 0.3,
        epochs: 150,
        trainRatio: 0.85,
        seed: 9,
      },
    });

    expect(result).toEqual(updatedConfig);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/playground-configs/config-pg-xor-01', {
      body: JSON.stringify({
        name: 'Renamed XOR baseline',
        config: {
          learningRate: 0.3,
          epochs: 150,
          trainRatio: 0.85,
          seed: 9,
        },
      }),
      headers: {
        authorization: 'Bearer local-id-token',
        'content-type': 'application/json',
      },
      method: 'PATCH',
    });
  });
});
