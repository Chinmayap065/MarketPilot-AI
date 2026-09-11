import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  buildPredictionSignal,
  classifyPredictionConfidence,
} from './prediction-signal';

describe('classifyPredictionConfidence', () => {
  it('classifies probabilities near neutral as low confidence', () => {
    expect(
      classifyPredictionConfidence(0.50),
    ).toBe('LOW');

    expect(
      classifyPredictionConfidence(0.59),
    ).toBe('LOW');

    expect(
      classifyPredictionConfidence(0.41),
    ).toBe('LOW');
  });

  it('classifies moderately directional probabilities as medium confidence', () => {
    expect(
      classifyPredictionConfidence(0.61),
    ).toBe('MEDIUM');

    expect(
      classifyPredictionConfidence(0.69),
    ).toBe('MEDIUM');

    expect(
      classifyPredictionConfidence(0.39),
    ).toBe('MEDIUM');

    expect(
      classifyPredictionConfidence(0.31),
    ).toBe('MEDIUM');
  });

  it('classifies strongly directional probabilities as high confidence', () => {
    expect(
      classifyPredictionConfidence(0.71),
    ).toBe('HIGH');

    expect(
      classifyPredictionConfidence(0.90),
    ).toBe('HIGH');

    expect(
      classifyPredictionConfidence(0.29),
    ).toBe('HIGH');

    expect(
      classifyPredictionConfidence(0.10),
    ).toBe('HIGH');
  });

  it('rejects probabilities below zero', () => {
    expect(() =>
      classifyPredictionConfidence(-0.01),
    ).toThrow(
      'prediction probability must be between 0 and 1',
    );
  });

  it('rejects probabilities above one', () => {
    expect(() =>
      classifyPredictionConfidence(1.01),
    ).toThrow(
      'prediction probability must be between 0 and 1',
    );
  });

  it('rejects non-finite probabilities', () => {
    expect(() =>
      classifyPredictionConfidence(NaN),
    ).toThrow(
      'prediction probability must be between 0 and 1',
    );
  });
});

describe('buildPredictionSignal', () => {
  it('builds an UP signal from class one', () => {
    const result =
      buildPredictionSignal({
        predictedClass: 1,
        probability: 0.72,
        modelName: 'logistic_regression',
        modelVersion: 'v1',
        horizon: 1,
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

  it('builds a DOWN signal from class zero', () => {
    const result =
      buildPredictionSignal({
        predictedClass: 0,
        probability: 0.29,
        modelName: 'logistic_regression',
        modelVersion: 'v1',
        horizon: 1,
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

  it('preserves the model metadata and horizon', () => {
    const result =
      buildPredictionSignal({
        predictedClass: 1,
        probability: 0.65,
        modelName: 'logistic_regression',
        modelVersion: 'v2',
        horizon: 3,
      });

    expect(result.model).toEqual({
      name: 'logistic_regression',
      version: 'v2',
    });

    expect(result.horizon).toBe(3);
    expect(result.probability).toBe(0.65);
  });

  it('rejects an invalid prediction class', () => {
    expect(() =>
      buildPredictionSignal({
        predictedClass: 2 as 0 | 1,
        probability: 0.72,
        modelName: 'logistic_regression',
        modelVersion: 'v1',
        horizon: 1,
      }),
    ).toThrow(
      'prediction class must be 0 or 1',
    );
  });

  it('rejects an invalid horizon', () => {
    expect(() =>
      buildPredictionSignal({
        predictedClass: 1,
        probability: 0.72,
        modelName: 'logistic_regression',
        modelVersion: 'v1',
        horizon: 0,
      }),
    ).toThrow(
      'prediction horizon must be a positive integer',
    );
  });

  it('rejects an empty model name', () => {
    expect(() =>
      buildPredictionSignal({
        predictedClass: 1,
        probability: 0.72,
        modelName: '   ',
        modelVersion: 'v1',
        horizon: 1,
      }),
    ).toThrow(
      'model name cannot be empty',
    );
  });

  it('rejects an empty model version', () => {
    expect(() =>
      buildPredictionSignal({
        predictedClass: 1,
        probability: 0.72,
        modelName: 'logistic_regression',
        modelVersion: '   ',
        horizon: 1,
      }),
    ).toThrow(
      'model version cannot be empty',
    );
  });
});