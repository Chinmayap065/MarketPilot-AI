import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  predictSignal,
} from './prediction-service';

import {
  predictModel,
} from './ml-service';

vi.mock('./ml-service', () => ({
  predictModel: vi.fn(),
}));

const mockedPredictModel =
  vi.mocked(predictModel);

describe('predictSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts an UP prediction into an UP signal', async () => {
    mockedPredictModel.mockResolvedValue({
      predictedClass: 1,
      probability: 0.72,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });

    const result = await predictSignal({
      artifactPath:
        '/models/logistic_regression-v1.joblib',
      features: [
        100,
        1000,
        0.01,
        0.00995,
        98,
        97,
        1.02,
        1.03,
        0.02,
        0.05,
        62,
      ],
    });

    expect(result).toEqual({
      direction: 'UP',
      confidence: 'HIGH',
      probability: 0.72,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });
  });

  it('converts a DOWN prediction into a DOWN signal', async () => {
    mockedPredictModel.mockResolvedValue({
      predictedClass: 0,
      probability: 0.29,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });

    const result = await predictSignal({
      artifactPath:
        '/models/logistic_regression-v1.joblib',
      features: [
        100,
        1000,
        -0.01,
        -0.01005,
        102,
        103,
        0.98,
        0.97,
        0.03,
        -0.04,
        38,
      ],
    });

    expect(result).toEqual({
      direction: 'DOWN',
      confidence: 'HIGH',
      probability: 0.29,
      model: {
        name: 'logistic_regression',
        version: 'v1',
      },
      horizon: 1,
    });
  });

  it('passes the prediction request to the ML service unchanged', async () => {
    mockedPredictModel.mockResolvedValue({
      predictedClass: 1,
      probability: 0.65,
      model: {
        name: 'logistic_regression',
        version: 'v2',
      },
      horizon: 3,
    });

    const request = {
      artifactPath:
        '/models/logistic_regression-v2.joblib',
      features: [
        110,
        2000,
        0.02,
        0.0198,
        108,
        105,
        1.0185,
        1.0476,
        0.015,
        0.03,
        58,
      ],
    };

    await predictSignal(request);

    expect(
      mockedPredictModel,
    ).toHaveBeenCalledTimes(1);

    expect(
      mockedPredictModel,
    ).toHaveBeenCalledWith(request);
  });

  it('preserves the ML model metadata and horizon', async () => {
    mockedPredictModel.mockResolvedValue({
      predictedClass: 1,
      probability: 0.65,
      model: {
        name: 'logistic_regression',
        version: 'v3',
      },
      horizon: 5,
    });

    const result = await predictSignal({
      artifactPath:
        '/models/logistic_regression-v3.joblib',
      features: [
        120,
        3000,
        0.015,
        0.0149,
        118,
        115,
        1.0169,
        1.0435,
        0.018,
        0.02,
        57,
      ],
    });

    expect(result.model).toEqual({
      name: 'logistic_regression',
      version: 'v3',
    });

    expect(result.horizon).toBe(5);
  });

  it('propagates ML service errors', async () => {
    mockedPredictModel.mockRejectedValue(
      new Error(
        'ML service returned HTTP 503',
      ),
    );

    await expect(
      predictSignal({
        artifactPath:
          '/models/logistic_regression-v1.joblib',
        features: [100],
      }),
    ).rejects.toThrow(
      'ML service returned HTTP 503',
    );
  });
});