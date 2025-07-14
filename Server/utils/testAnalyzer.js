/**
 * Analyzes MBTI test answers and returns the 4-letter MBTI type.
 *
 * @param {Array} answers - Array of user answers, e.g. [{questionId: 1, value: 4}, ...]
 * @param {Array} questions - The full MBTI questions array to reference directions and traits
 * @returns {Object} - { mbtiType: "ENTJ", scores: {...} }
 */
function analyzeMBTI(answers, questions) {
  // Initialize scores for both sides of each trait
  const traitScores = {
    EI: { E: 0, I: 0 },
    SN: { S: 0, N: 0 },
    TF: { T: 0, F: 0 },
    JP: { J: 0, P: 0 },
  };

  // For each answer, find the question details
  answers.forEach(({ questionId, value }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return; // skip if question not found

    const { trait, direction } = question;

    // The side favored by higher value is direction (e.g. 'E'), opposite side is the other letter
    // So add score directly to the direction side
    traitScores[trait][direction] += value;

    // For the opposite side, add inverse score (5 - value + 1) to balance out
    // (1 maps to 5, 5 maps to 1, 3 is neutral)
    const oppositeSide = Object.keys(traitScores[trait]).find(
      (side) => side !== direction
    );
    traitScores[trait][oppositeSide] += 6 - value; // inverse score
  });

  // Calculate final MBTI type
  const mbtiType = Object.entries(traitScores)
    .map(([trait, scores]) => {
      return scores[Object.keys(scores)[0]] >= scores[Object.keys(scores)[1]]
        ? Object.keys(scores)[0]
        : Object.keys(scores)[1];
    })
    .join("");

  return { mbtiType, scores: traitScores };
}
// Output Example:

/**
 * Analyzes DISC test answers.
 *
 * @param {Array} answers - [{ questionId: number, selectedTrait: string }]
 * @param {Array} questions - Full DISC questions array
 * @returns {Object} - { scores: {D, I, S, C}, dominantTraits: string[] }
 */
function analyzeDISC(answers, questions) {
  const scores = { D: 0, I: 0, S: 0, C: 0 };
console.log("we are analizing the disc test for now ..,.,.,.,.,.,.,.,.,.,");

  answers.forEach(({ questionId, selectedTrait }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (question.type === "best") {
      // Add 1 point to selected trait
      scores[selectedTrait] = (scores[selectedTrait] || 0) + 1;
    } else if (question.type === "worst") {
      // Subtract 1 point to selected trait
      scores[selectedTrait] = (scores[selectedTrait] || 0) - 1;
    }
  });

  // Find dominant traits (top 1 or more if tied)
  const maxScore = Math.max(...Object.values(scores));
  const dominantTraits = Object.entries(scores)
    .filter(([_, score]) => score === maxScore && score > 0)
    .map(([trait]) => trait);

  return { scores, dominantTraits };
}
// Output Example:

/**
 * Analyze Holland test answers.
 *
 * @param {Array} answers - Array of { questionId: number, answer: "بله" | "خیر" }
 * @param {Array} questions - The full Holland_Test array
 * @returns {Object} - { scores: { R, I, A, S, E, C }, dominantTraits: string[] }
 */
function analyzeHolland(answers, questions) {
  const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  answers.forEach(({ questionId, answer }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (answer === "بله") {
      scores[question.type] = (scores[question.type] || 0) + 1;
    }
    // No score if "خیر"
  });

  const maxScore = Math.max(...Object.values(scores));
  const dominantTraits = Object.entries(scores)
    .filter(([_, score]) => score === maxScore && score > 0)
    .map(([trait]) => trait);

  return { scores, dominantTraits };
}
// Output Example:
// {
//   scores: { R: 2, I: 0, A: 1, S: 1, E: 0, C: 1 },
//   dominantTraits: ["R"]
// }

/**
 * Analyze Gardner test answers based on selected option values.
 *
 * @param {Array} answers - Array of { questionId: number, value: number }
 * @param {Array} questions - The full Gardner_Test array
 * @returns {Object} - { scores: { L, M, S, B, Mu, I, In, N }, topIntelligences: string[], summary: string }
 */
function analyzeGardner(answers, questions) {
  const scores = {
    L: 0,
    M: 0,
    S: 0,
    B: 0,
    Mu: 0,
    I: 0,
    In: 0,
    N: 0,
  };

  answers.forEach(({ questionId, value }) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && scores.hasOwnProperty(question.type)) {
      scores[question.type] += value;
    }
  });

  // Get the highest score(s)
  const maxScore = Math.max(...Object.values(scores));
  const topIntelligences = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([type]) => type);

  // Optional summary (human-readable)
  const intelligenceNames = {
    L: "کلامی-زبانی (Linguistic)",
    M: "منطقی-ریاضی (Logical-Mathematical)",
    S: "فضایی (Spatial)",
    B: "بدنی-جنبشی (Bodily-Kinesthetic)",
    Mu: "موسیقایی (Musical)",
    I: "میان‌فردی (Interpersonal)",
    In: "درون‌فردی (Intrapersonal)",
    N: "طبیعت‌گرا (Naturalistic)",
  };

  const summary = topIntelligences.map((t) => intelligenceNames[t]).join(" و ");

  return { scores, topIntelligences, summary };
}

// Output Example:
// {
//   scores: { L: 5, M: 4, S: 3, B: 2, Mu: 4, I: 5, In: 4, N: 5 },
//   topIntelligences: ['L', 'I', 'N'],
//   summary: "کلامی-زبانی (Linguistic) و میان‌فردی (Interpersonal) و طبیعت‌گرا (Naturalistic)"
// }

/**
 * Analyze CliftonStrengths test answers.
 *
 * @param {Array} answers - Array of { questionId: number, choice: "A" | "B" }
 * @param {Array} questions - The full Clifton_Test array
 * @returns {Object} - { scores: { [theme]: number }, topThemes: string[] }
 */
function analyzeClifton(answers, questions) {
  const scores = {};

  // Initialize scores keys from all themes in questions
  questions.forEach((q) => {
    scores[q.theme_a] = 0;
    scores[q.theme_b] = 0;
  });

  // Count answers
  answers.forEach(({ questionId, choice }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (choice === "A") {
      scores[question.theme_a]++;
    } else if (choice === "B") {
      scores[question.theme_b]++;
    }
  });

  // Find highest score(s)
  const maxScore = Math.max(...Object.values(scores));
  const topThemes = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([theme]) => theme);

  return { scores, topThemes };
}

// Output Example:
// {
//   scores: {
//     Futuristic: 1,
//     Context: 0,
//     Developer: 0,
//     Positivity: 2,
//     Relator: 1,
//     Connectedness: 0,
//     Consistency: 0,
//     "Self-Assurance": 2
//   },
//   topThemes: ["Positivity", "Self-Assurance"]
// }

export const getTestAnalysis = (testType, answers) => {
  switch (testType) {
    case "MBTI":
      return analyzeMBTI(answers);
    case "DISC":
      return analyzeDISC(answers);
    case "HOLLAND":
      return analyzeHolland(answers);
    case "GARDNER":
      return analyzeGardner(answers);
    case "CLIFTON":
      return analyzeClifton(answers);
    default:
      return { summary: "نوع تست نامعتبر است" };
  }
};
