import React from 'react';

import MbtiAnalysis from './analysis/MbtiAnalysis';
import DiscAnalysis from './analysis/DiscAnalysis';
import HollandAnalysis from './analysis/HollandAnalysis';
import GardnerAnalysis from './analysis/GardnerAnalysis';
import CliftonStrengthsAnalysis from './analysis/CliftonStrengthsAnalysis';
import GHQAnalysis from './analysis/GHQAnalysis';
import PersonalFavoritesAnalysis  from './analysis/PersonalFavoritesAnalysis';

const componentsByType = {
  MBTI: MbtiAnalysis,
  DISC: DiscAnalysis,
  HOLLAND: HollandAnalysis,
  GARDNER: GardnerAnalysis,
  CLIFTON: CliftonStrengthsAnalysis,
  GHQ: GHQAnalysis,
  PERSONAL_FAVORITES: PersonalFavoritesAnalysis,
};

const isObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);

const hasNumericValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' && value.trim() !== '') return Number.isFinite(Number(value));
  if (Array.isArray(value)) return value.some(hasNumericValue);
  if (isObject(value)) return Object.values(value).some(hasNumericValue);
  return false;
};

const hasNonZeroNumericValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue !== 0;
  }
  if (Array.isArray(value)) return value.some(hasNonZeroNumericValue);
  if (isObject(value)) return Object.values(value).some(hasNonZeroNumericValue);
  return false;
};

const firstObject = (...values) => values.find(isObject) || {};
const firstScoreObject = (...values) =>
  values.find((value) => isObject(value) && hasNonZeroNumericValue(value)) ||
  values.find((value) => isObject(value) && hasNumericValue(value)) ||
  firstObject(...values);

const normalizeAnalysisData = (raw) => {
  const root = firstObject(raw?.analysis, raw?.data, raw);
  const dataForUI = firstObject(root.dataForUI, raw?.dataForUI);

  const normalizedScores = firstScoreObject(
    root.normalizedScores,
    dataForUI.normalizedScores,
    root.scores,
    dataForUI.scores
  );

  const rawScores = firstScoreObject(
    root.rawScores,
    dataForUI.rawScores,
    root.raw,
    dataForUI.raw,
    root.scores,
    dataForUI.scores
  );

  const chartData = root.chartData || dataForUI.chartData || null;

  return {
    ...root,
    rawScores,
    normalizedScores,
    scores: firstScoreObject(root.scores, normalizedScores),
    chartData,
    dataForUI: {
      ...dataForUI,
      rawScores: firstScoreObject(dataForUI.rawScores, rawScores),
      normalizedScores: firstScoreObject(dataForUI.normalizedScores, normalizedScores),
      scores: firstScoreObject(dataForUI.scores, normalizedScores),
      chartData,
    },
  };
};

const ShowAnalysis = ({ testType, analysisData }) => {
  const AnalysisComponent = componentsByType[testType];

  if (!AnalysisComponent) {
    return <div>نوع تحلیل مشخص نیست.</div>;
  }

  const normalizedData = normalizeAnalysisData(analysisData);
  const hasUsableData =
    hasNumericValue(normalizedData.normalizedScores) ||
    hasNumericValue(normalizedData.rawScores) ||
    hasNumericValue(normalizedData.chartData?.datasets?.[0]?.data) ||
    hasNumericValue(normalizedData.dataForUI?.normalizedScores);

  if (!hasUsableData) {
    return <p className="muted" dir="rtl">داده‌ی تحلیل برای نمایش نمودار آماده نیست.</p>;
  }

  return (
    <div>
      <AnalysisComponent data={normalizedData} />
    </div>
  );
};

export default ShowAnalysis;
