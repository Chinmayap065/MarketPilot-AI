export type PredictionDirection =
  | 'UP'
  | 'DOWN';

export type PredictionConfidence =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export interface PredictionSignalInput {
  predictedClass: 0 | 1;
  probability: number;
  modelName: string;
  modelVersion: string;
  horizon: number;
}

export interface PredictionSignal {
  direction: PredictionDirection;
  confidence: PredictionConfidence;
  probability: number;
  model: {
    name: string;
    version: string;
  };
  horizon: number;
}

function validateProbability(
  probability: number,
): void {
  if (
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
  ) {
    throw new Error(
      'prediction probability must be between 0 and 1',
    );
  }
}

function validatePredictionClass(
  predictedClass: number,
): void {
  if (
    predictedClass !== 0 &&
    predictedClass !== 1
  ) {
    throw new Error(
      'prediction class must be 0 or 1',
    );
  }
}

function validateHorizon(
  horizon: number,
): void {
  if (
    !Number.isInteger(horizon) ||
    horizon < 1
  ) {
    throw new Error(
      'prediction horizon must be a positive integer',
    );
  }
}

function validateModelMetadata(
  modelName: string,
  modelVersion: string,
): void {
  if (!modelName.trim()) {
    throw new Error(
      'model name cannot be empty',
    );
  }

  if (!modelVersion.trim()) {
    throw new Error(
      'model version cannot be empty',
    );
  }
}

export function classifyPredictionConfidence(
  probability: number,
): PredictionConfidence {
  validateProbability(probability);

  const distanceFromNeutral =
    Math.abs(probability - 0.5);

  if (distanceFromNeutral >= 0.20) {
    return 'HIGH';
  }

  if (distanceFromNeutral >= 0.10) {
    return 'MEDIUM';
  }

  return 'LOW';
}

export function buildPredictionSignal(
  input: PredictionSignalInput,
): PredictionSignal {
  validatePredictionClass(
    input.predictedClass,
  );

  validateProbability(
    input.probability,
  );

  validateHorizon(
    input.horizon,
  );

  validateModelMetadata(
    input.modelName,
    input.modelVersion,
  );

  const direction =
    input.predictedClass === 1
      ? 'UP'
      : 'DOWN';

  return {
    direction,
    confidence:
      classifyPredictionConfidence(
        input.probability,
      ),
    probability: input.probability,
    model: {
      name: input.modelName,
      version: input.modelVersion,
    },
    horizon: input.horizon,
  };
}