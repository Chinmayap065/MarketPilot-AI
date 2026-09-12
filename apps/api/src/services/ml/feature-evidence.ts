import type { MarketFeatureRow } from '../market-data/features';

export type EvidenceDirection = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface FeatureEvidence {
  feature: string;
  direction: EvidenceDirection;
  message: string;
  value: number;
}

const POSITIVE_RETURN_THRESHOLD = 0;
const POSITIVE_RSI_THRESHOLD = 55;
const NEGATIVE_RSI_THRESHOLD = 45;
const ELEVATED_VOLATILITY_THRESHOLD = 0.02;
const POSITIVE_VOLUME_CHANGE_THRESHOLD = 0.05;
const NEGATIVE_VOLUME_CHANGE_THRESHOLD = -0.05;

function validateFiniteValue(
  value: number,
  feature: string,
): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${feature} must be a finite number`);
  }
}

function addEvidence(
  evidence: FeatureEvidence[],
  feature: string,
  direction: EvidenceDirection,
  message: string,
  value: number,
): void {
  evidence.push({
    feature,
    direction,
    message,
    value,
  });
}

export function buildFeatureEvidence(
  features: MarketFeatureRow,
): FeatureEvidence[] {
  const evidence: FeatureEvidence[] = [];

  validateFiniteValue(features.close, 'close');

  if (
    features.sma_10 !== null &&
    features.sma_10 !== undefined
  ) {
    validateFiniteValue(features.sma_10, 'sma_10');

    if (features.close > features.sma_10) {
      addEvidence(
        evidence,
        'sma_10',
        'POSITIVE',
        'Price is above the 10-period moving average.',
        features.sma_10,
      );
    } else if (features.close < features.sma_10) {
      addEvidence(
        evidence,
        'sma_10',
        'NEGATIVE',
        'Price is below the 10-period moving average.',
        features.sma_10,
      );
    } else {
      addEvidence(
        evidence,
        'sma_10',
        'NEUTRAL',
        'Price is equal to the 10-period moving average.',
        features.sma_10,
      );
    }
  }

  if (
    features.sma_20 !== null &&
    features.sma_20 !== undefined
  ) {
    validateFiniteValue(features.sma_20, 'sma_20');

    if (features.close > features.sma_20) {
      addEvidence(
        evidence,
        'sma_20',
        'POSITIVE',
        'Price is above the 20-period moving average.',
        features.sma_20,
      );
    } else if (features.close < features.sma_20) {
      addEvidence(
        evidence,
        'sma_20',
        'NEGATIVE',
        'Price is below the 20-period moving average.',
        features.sma_20,
      );
    } else {
      addEvidence(
        evidence,
        'sma_20',
        'NEUTRAL',
        'Price is equal to the 20-period moving average.',
        features.sma_20,
      );
    }
  }

  if (
    features.return_1 !== null &&
    features.return_1 !== undefined
  ) {
    validateFiniteValue(features.return_1, 'return_1');

    if (features.return_1 > POSITIVE_RETURN_THRESHOLD) {
      addEvidence(
        evidence,
        'return_1',
        'POSITIVE',
        'The most recent return is positive.',
        features.return_1,
      );
    } else if (features.return_1 < POSITIVE_RETURN_THRESHOLD) {
      addEvidence(
        evidence,
        'return_1',
        'NEGATIVE',
        'The most recent return is negative.',
        features.return_1,
      );
    } else {
      addEvidence(
        evidence,
        'return_1',
        'NEUTRAL',
        'The most recent return is flat.',
        features.return_1,
      );
    }
  }

  if (
    features.rsi_14 !== null &&
    features.rsi_14 !== undefined
  ) {
    validateFiniteValue(features.rsi_14, 'rsi_14');

    if (features.rsi_14 > POSITIVE_RSI_THRESHOLD) {
      addEvidence(
        evidence,
        'rsi_14',
        'POSITIVE',
        'RSI indicates positive momentum.',
        features.rsi_14,
      );
    } else if (features.rsi_14 < NEGATIVE_RSI_THRESHOLD) {
      addEvidence(
        evidence,
        'rsi_14',
        'NEGATIVE',
        'RSI indicates negative momentum.',
        features.rsi_14,
      );
    } else {
      addEvidence(
        evidence,
        'rsi_14',
        'NEUTRAL',
        'RSI is in a neutral momentum range.',
        features.rsi_14,
      );
    }
  }

  if (
    features.volume_change_1 !== null &&
    features.volume_change_1 !== undefined
  ) {
    validateFiniteValue(
      features.volume_change_1,
      'volume_change_1',
    );

    if (
      features.volume_change_1 >=
      POSITIVE_VOLUME_CHANGE_THRESHOLD
    ) {
      addEvidence(
        evidence,
        'volume_change_1',
        'POSITIVE',
        'Trading volume has increased meaningfully from the previous period.',
        features.volume_change_1,
      );
    } else if (
      features.volume_change_1 <=
      NEGATIVE_VOLUME_CHANGE_THRESHOLD
    ) {
      addEvidence(
        evidence,
        'volume_change_1',
        'NEGATIVE',
        'Trading volume has decreased meaningfully from the previous period.',
        features.volume_change_1,
      );
    } else {
      addEvidence(
        evidence,
        'volume_change_1',
        'NEUTRAL',
        'Trading volume is relatively stable versus the previous period.',
        features.volume_change_1,
      );
    }
  }

  if (
    features.volatility_10 !== null &&
    features.volatility_10 !== undefined
  ) {
    validateFiniteValue(
      features.volatility_10,
      'volatility_10',
    );

    if (
      features.volatility_10 >=
      ELEVATED_VOLATILITY_THRESHOLD
    ) {
      addEvidence(
        evidence,
        'volatility_10',
        'NEGATIVE',
        'Recent market volatility is elevated.',
        features.volatility_10,
      );
    } else {
      addEvidence(
        evidence,
        'volatility_10',
        'NEUTRAL',
        'Recent market volatility is relatively controlled.',
        features.volatility_10,
      );
    }
  }

  return evidence;
}