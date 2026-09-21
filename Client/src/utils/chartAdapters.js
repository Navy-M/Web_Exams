const PERCENT = "percent";

const DEFINITIONS = {
  DISC: {
    keys: ["D", "I", "S", "C"],
    labels: ["سلطه‌گری", "تأثیرگذاری", "ثبات", "وظیفه‌شناسی"],
  },
  HOLLAND: {
    keys: ["R", "I", "A", "S", "E", "C"],
    labels: ["واقع‌گرا", "جستجوگر", "هنری", "اجتماعی", "متهور", "قراردادی"],
  },
  GARDNER: {
    keys: ["L", "M", "S", "B", "Mu", "I", "In", "N"],
    labels: [
      "زبانی", "منطقی-ریاضی", "فضایی", "بدنی-حرکتی",
      "موسیقایی", "میان‌فردی", "درون‌فردی", "طبیعت‌گرا",
    ],
  },
  GHQ: {
    keys: ["Stress", "Mood", "Function", "Social"],
    labels: ["استرس", "خلق", "عملکرد", "عملکرد اجتماعی"],
  },
};

const MBTI_PAIRS = {
  EI: ["E", "I"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

const isRecord = (value) => value && typeof value === "object" && !Array.isArray(value);

export function normalizeChartValue(value, scale = PERCENT) {
  const raw = typeof value === "string" ? value.trim().replace(/%$/, "") : value;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return 0;
  const percent = scale === "fraction" ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, Math.round(percent * 100) / 100));
}

function sourceScores(data) {
  const candidates = [
    data?.dataForUI?.normalizedScores,
    data?.normalizedScores,
    data?.dataForUI?.scores,
    data?.scores,
  ];
  return candidates.find(isRecord) || {};
}

function chartFallback(data) {
  const chart = data?.dataForUI?.chartData || data?.chartData;
  const values = chart?.datasets?.[0]?.data;
  return Array.isArray(values) ? values : [];
}

function assertModel(model, expectedLength) {
  if (model.labels.length !== model.values.length || model.values.length !== expectedLength) {
    throw new Error(`Invalid ${model.testType} chart contract`);
  }
  if (!model.values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
    throw new Error(`Invalid ${model.testType} chart values`);
  }
  return model;
}

function buildMbtiModel(data) {
  const source = sourceScores(data);
  const scores = {};
  const labels = [];
  const values = [];

  Object.entries(MBTI_PAIRS).forEach(([dimension, [left, right]]) => {
    const leftRaw = normalizeChartValue(source?.[dimension]?.[left]);
    const rightRaw = normalizeChartValue(source?.[dimension]?.[right]);
    const total = leftRaw + rightRaw;
    const leftValue = total > 0 ? Math.round((leftRaw / total) * 10000) / 100 : 0;
    const rightValue = total > 0 ? Math.round((100 - leftValue) * 100) / 100 : 0;
    scores[dimension] = { [left]: leftValue, [right]: rightValue };
    labels.push(`${left}/${right}`);
    values.push(Math.max(leftValue, rightValue));
  });

  return assertModel({ testType: "MBTI", labels, values, scores, scale: PERCENT }, 4);
}

export function buildChartModel(testType, data = {}) {
  if (testType === "MBTI") return buildMbtiModel(data);

  const source = sourceScores(data);
  const fallback = chartFallback(data);
  const definition = DEFINITIONS[testType];
  const keys = definition?.keys || Object.keys(source);
  const labels = definition?.labels || keys.map(String);
  const values = keys.map((key, index) =>
    normalizeChartValue(source[key] ?? fallback[index], PERCENT)
  );
  const scores = Object.fromEntries(keys.map((key, index) => [key, values[index]]));

  return assertModel({ testType, keys, labels, values, scores, scale: PERCENT }, keys.length);
}

export function applyChartContract(testType, data = {}) {
  const model = buildChartModel(testType, data);
  const dataForUI = isRecord(data.dataForUI) ? data.dataForUI : {};
  return {
    ...data,
    normalizedScores: model.scores,
    chartData: null,
    chartContract: model,
    dataForUI: {
      ...dataForUI,
      normalizedScores: model.scores,
      chartData: null,
      chartContract: model,
    },
  };
}

export const chartDefinitions = DEFINITIONS;
