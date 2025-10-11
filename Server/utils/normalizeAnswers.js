// Server/utils/normalizeAnswers.js
export function normalizeAnswers(testType, answers) {
  if (!Array.isArray(answers)) return [];
  return answers
    .map((a) => {
      if (!a) return null;
      const qidRaw = a.questionId ?? a.id ?? a.qid;
      const valRaw = a.value ?? a.answer ?? a.choice ?? a.v;

      const questionId = Number(qidRaw);
      const value =
        typeof valRaw === "boolean"
          ? valRaw
            ? 1
            : 0
          : valRaw === "" || valRaw == null
          ? NaN
          : Number(valRaw);

      if (!Number.isFinite(questionId) || !Number.isFinite(value)) return null;
      return { questionId, value };
    })
    .filter(Boolean);
}

export default normalizeAnswers;
