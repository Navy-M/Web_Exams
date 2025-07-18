import * as Dummy from "../config/dummyData.js";

//#region MBTI
/**
 * تحلیل پاسخ‌های آزمون MBTI و تعیین تیپ شخصیتی
 * @param {Array} answers - آرایه پاسخ‌ها به فرمت [{questionId: number, value: number}]
 * @param {Array} [questions] - آرایه سوالات (پیش‌فرض از Dummy.Mbti_Test استفاده می‌کند)
 * @returns {Object} - نتیجه تحلیل کامل تیپ شخصیتی
 */
function analyzeMBTI(answers, questions = Dummy.Mbti_Test) {
  // 1. مقداردهی اولیه امتیازات
  const traitScores = {
    EI: { E: 0, I: 0 }, // برون‌گرایی (E) vs درون‌گرایی (I)
    SN: { S: 0, N: 0 }, // حسی (S) vs شهودی (N)
    TF: { T: 0, F: 0 }, // تفکری (T) vs احساسی (F)
    JP: { J: 0, P: 0 }, // قضاوتی (J) vs ادراکی (P)
  };

  // 2. محاسبه امتیازات بر اساس پاسخ‌ها
  answers.forEach(({ questionId, value }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const { trait, direction } = question;

    // امتیاز مستقیم به جهت سوال
    traitScores[trait][direction] += value;

    // امتیاز معکوس به جهت مخالف (مقیاس 1-5)
    const oppositeSide = Object.keys(traitScores[trait]).find(
      (s) => s !== direction
    );
    traitScores[trait][oppositeSide] += 6 - value;
  });

  // 3. تعیین تیپ نهایی
  const mbtiType = Object.entries(traitScores)
    .map(([trait, scores]) => {
      const [side1, side2] = Object.keys(scores);
      return scores[side1] >= scores[side2] ? side1 : side2;
    })
    .join("");

  // 4. محاسبه درصدهای نرمال‌شده برای هر ویژگی
  const totalQuestionsPerTrait = answers.length / 4; // تقسیم مساوی سوالات بین ۴ بعد
  const maxPossibleScore = totalQuestionsPerTrait * 5;

  const normalizedScores = Object.fromEntries(
    Object.entries(traitScores).map(([trait, scores]) => [
      trait,
      Object.fromEntries(
        Object.entries(scores).map(([side, score]) => [
          side,
          Math.round((score / maxPossibleScore) * 100),
        ])
      ),
    ])
  );

  // 5. اطلاعات توصیفی هر تیپ
  const traitDescriptions = {
    E: {
      name: "برون‌گرا",
      description: "انرژی خود را از تعامل با دیگران می‌گیرد",
    },
    I: {
      name: "درون‌گرا",
      description: "انرژی خود را از تنهایی و تفکر می‌گیرد",
    },
    S: { name: "حسی", description: "بر واقعیات و اطلاعات ملموس تمرکز دارد" },
    N: { name: "شهودی", description: "بر الهامات و احتمالات آینده تمرکز دارد" },
    T: {
      name: "تفکری",
      description: "در تصمیم‌گیری به منطق و عدالت توجه دارد",
    },
    F: {
      name: "احساسی",
      description: "در تصمیم‌گیری به ارزش‌ها و هماهنگی توجه دارد",
    },
    J: { name: "قضاوتی", description: "ساختارمند و برنامه‌ریز است" },
    P: { name: "ادراکی", description: "انعطاف‌پذیر و خودانگیخته است" },
  };

  // 6. آماده‌سازی خروجی حرفه‌ای
  return {
    // اطلاعات پایه
    mbtiType, // تیپ چهارحرفی (مثال: "INTJ")
    typeName: getMBTITypeName(mbtiType), // نام توصیفی تیپ

    // داده‌های خام
    rawScores: traitScores,
    normalizedScores, // امتیازات درصدی

    // تحلیل هر بعد
    dimensions: Object.entries(traitScores).map(([trait, scores]) => ({
      dimension: trait,
      yourSide: mbtiType[traitIndex(trait)],
      scores: {
        [Object.keys(scores)[0]]: {
          name: traitDescriptions[Object.keys(scores)[0]].name,
          score: scores[Object.keys(scores)[0]],
          percentage: normalizedScores[trait][Object.keys(scores)[0]],
        },
        [Object.keys(scores)[1]]: {
          name: traitDescriptions[Object.keys(scores)[1]].name,
          score: scores[Object.keys(scores)[1]],
          percentage: normalizedScores[trait][Object.keys(scores)[1]],
        },
      },
      difference: Math.abs(
        scores[Object.keys(scores)[0]] - scores[Object.keys(scores)[1]]
      ),
      description: `شما بیشتر تمایل به ${
        traitDescriptions[mbtiType[traitIndex(trait)]].name
      } دارید`,
    })),

    // داده‌های نمودار
    chartData: {
      labels: [
        "برون‌گرایی/درون‌گرایی",
        "حسی/شهودی",
        "تفکری/احساسی",
        "قضاوتی/ادراکی",
      ],
      datasets: [
        {
          label: "امتیاز اصلی",
          data: Object.values(traitScores).map(
            (scores, i) => (scores[mbtiType[i]] / maxPossibleScore) * 100
          ),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
        {
          label: "امتیاز مقابل",
          data: Object.values(traitScores).map(
            (scores, i) =>
              (scores[Object.keys(scores).find((k) => k !== mbtiType[i])] /
                maxPossibleScore) *
              100
          ),
          backgroundColor: "rgba(255, 99, 132, 0.7)",
        },
      ],
    },

    // اطلاعات زمانی
    analyzedAt: new Date().toISOString(),
  };
}
// تابع کمکی برای تبدیل تیپ به نام فارسی
function getMBTITypeName(type) {
  const typeNames = {
    INTJ: "معماری",
    INTP: "منطق‌دان",
    ENTJ: "فرمانده",
    ENTP: "مبتکر",
    INFJ: "مشاور",
    INFP: "آرمان‌گرا",
    ENFJ: "پیشرو",
    ENFP: "تاثیرگذار",
    ISTJ: "بازرس",
    ISFJ: "محافظ",
    ESTJ: "مدیر",
    ESFJ: "مراقب",
    ISTP: "صنعتگر",
    ISFP: "هنرمند",
    ESTP: "متقاعدگر",
    ESFP: "سرگرم‌کننده",
  };
  return typeNames[type] || "ناشناخته";
}
// تابع کمکی برای پیدا کردن اندیس هر بعد
function traitIndex(trait) {
  return { EI: 0, SN: 1, TF: 2, JP: 3 }[trait];
}
// Output Example:
/*
{
  mbtiType: "INTJ",
  typeName: "معماری",
  rawScores: {
    EI: { E: 12, I: 18 },
    SN: { S: 10, N: 20 },
    TF: { T: 22, F: 8 },
    JP: { J: 19, P: 11 }
  },
  normalizedScores: {
    EI: { E: 40, I: 60 },
    SN: { S: 33, N: 67 },
    TF: { T: 73, F: 27 },
    JP: { J: 63, P: 37 }
  },
  dimensions: [
    {
      dimension: "EI",
      yourSide: "I",
      scores: {
        E: { name: "برون‌گرا", score: 12, percentage: 40 },
        I: { name: "درون‌گرا", score: 18, percentage: 60 }
      },
      difference: 6,
      description: "شما بیشتر تمایل به درون‌گرا دارید"
    },
    ...
  ],
  chartData: { ... },
  analyzedAt: "2023-07-20T12:34:56.789Z"
}
*/

//#endregion

//#region DISC
/**
 * Analyzes DISC test answers and returns detailed personality profile
 * @param {Array} answers - [{ questionId: number, selectedTrait: string }]
 * @param {Array} [questions] - Optional questions array (uses default if not provided)
 * @returns {Object} - Detailed DISC profile with scores, traits, analysis, and visualization data
 */
function analyzeDISC(answers, questions = Dummy.Disc_Test) {
  // 1. Initialize scores with all possible traits
  const traits = ["D", "I", "S", "C"];
  const scores = traits.reduce((acc, trait) => ({ ...acc, [trait]: 0 }), {});

  // 2. Calculate raw scores
  answers.forEach(({ questionId, selectedTrait }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !traits.includes(selectedTrait)) return;

    scores[selectedTrait] += question.type === "best" ? 1 : -1;
  });

  // 3. Normalize scores to percentage (0-100 scale)
  const maxPossible = answers.filter((a) =>
    questions.some((q) => q.id === a.questionId && q.type === "best")
  ).length;
  const minPossible = -answers.filter((a) =>
    questions.some((q) => q.id === a.questionId && q.type === "worst")
  ).length;
  const range = maxPossible - minPossible;

  const normalizedScores = Object.fromEntries(
    Object.entries(scores).map(([trait, score]) => [
      trait,
      Math.round(((score - minPossible) / range) * 100),
    ])
  );

  // 4. Determine dominant traits (with tie handling)
  const sortedTraits = Object.entries(normalizedScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0);

  const dominantTraits = sortedTraits
    .filter(([_, score]) => score === sortedTraits[0][1])
    .map(([trait]) => trait);

  // 5. Prepare detailed interpretation
  const traitDescriptions = {
    D: { name: "Dominance", description: "Direct, decisive, problem-solver" },
    I: { name: "Influence", description: "Enthusiastic, social, persuasive" },
    S: { name: "Steadiness", description: "Patient, reliable, team player" },
    C: {
      name: "Conscientiousness",
      description: "Analytical, precise, quality-focused",
    },
  };

  // 6. Generate comprehensive result
  return {
    // Raw data
    rawScores: scores,
    normalizedScores,

    // Dominance analysis
    dominantTraits,
    primaryTrait: dominantTraits[0],
    secondaryTrait: sortedTraits.length > 1 ? sortedTraits[1][0] : null,

    // Interpretation
    traits: Object.fromEntries(
      traits.map((trait) => [
        trait,
        {
          ...traitDescriptions[trait],
          score: normalizedScores[trait],
          percentile: normalizedScores[trait], // Already in percentage
        },
      ])
    ),

    // Visualization-friendly format
    chartData: {
      labels: traits.map((t) => traitDescriptions[t].name),
      datasets: [
        {
          label: "DISC Profile",
          data: traits.map((t) => normalizedScores[t]),
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)", // D - Red
            "rgba(54, 162, 235, 0.7)", // I - Blue
            "rgba(75, 192, 192, 0.7)", // S - Green
            "rgba(255, 206, 86, 0.7)", // C - Yellow
          ],
        },
      ],
    },

    // Summary
    summary:
      dominantTraits.length > 1
        ? `Balanced ${dominantTraits
            .map((t) => traitDescriptions[t].name)
            .join("/")} profile`
        : `Strong ${traitDescriptions[dominantTraits[0]].name} tendency`,

    // Timestamp
    analyzedAt: new Date().toISOString(),
  };
}
// Output Example:
/*
{
  // نمرات خام هر ویژگی (امتیاز مستقیم از پاسخ‌ها)
  rawScores: { 
    D: 5,  // امتیاز خام ویژگی سلطه‌گری (Dominance)
    I: 3,  // امتیاز خام ویژگی تأثیرگذاری (Influence)
    S: -2, // امتیاز خام ویژگی ثبات (Steadiness)
    C: 1   // امتیاز خام ویژگی وظیفه‌شناسی (Conscientiousness)
  },
  
  // نمرات نرمال‌شده بر اساس درصد (۰ تا ۱۰۰)
  normalizedScores: { 
    D: 85, // ۸۵% در ویژگی سلطه‌گری
    I: 65, // ۶۵% در ویژگی تأثیرگذاری
    S: 30, // ۳۰% در ویژگی ثبات
    C: 55  // ۵۵% در ویژگی وظیفه‌شناسی
  },
  
  dominantTraits: ['D'], // ویژگی(های) غالب (بالاترین امتیاز)
  primaryTrait: 'D',     // ویژگی اصلی (اولین ویژگی غالب)
  secondaryTrait: 'I',   // ویژگی ثانویه (دومین امتیاز بالا)
  
  // تفسیر کامل هر ویژگی
  traits: {
    D: { 
      name: "سلطه‌گری", 
      description: "مستقیم، قاطع و حل‌کننده مسئله", 
      score: 85,       // امتیاز نرمال‌شده
      percentile: 85   // درصد نسبت به حداکثر امتیاز ممکن
    },
    I: { 
      name: "تأثیرگذاری", 
      description: "پرانرژی، اجتماعی و متقاعدکننده", 
      score: 65, 
      percentile: 65 
    },
    S: { 
      name: "ثبات", 
      description: "صبور، قابل اعتماد و تیمی", 
      score: 30, 
      percentile: 30 
    },
    C: { 
      name: "وظیفه‌شناسی", 
      description: "تحلیل‌گر، دقیق و متمرکز بر کیفیت", 
      score: 55, 
      percentile: 55 
    }
  },
  
  // داده‌های آماده برای نمایش نمودار (فرمت مناسب برای کتابخانه‌هایی مانند Chart.js)
  chartData: { 
    labels: ["سلطه‌گری", "تأثیرگذاری", "ثبات", "وظیفه‌شناسی"],
    datasets: [{
      label: 'پروفایل DISC',
      data: [85, 65, 30, 55],
      backgroundColor: [
        'rgba(255, 99, 132, 0.7)', // قرمز برای سلطه‌گری
        'rgba(54, 162, 235, 0.7)',  // آبی برای تأثیرگذاری
        'rgba(75, 192, 192, 0.7)',  // سبز برای ثبات
        'rgba(255, 206, 86, 0.7)'   // زرد برای وظیفه‌شناسی
      ]
    }]
  },
  
  // خلاصه تحلیل به زبان طبیعی
  summary: "تمایل قوی به ویژگی سلطه‌گری",
  
  // زمان انجام تحلیل (فرمت استاندارد)
  analyzedAt: "2023-07-20T12:34:56.789Z"
}
*/

//#endregion

//#region HOLLAND
/**
 * تحلیل آزمون هالند (RIASEC) و تعیین کد شغلی
 * @param {Array} answers - آرایه پاسخ‌ها به فرمت [{questionId: number, answer: "بله"|"خیر"}]
 * @param {Array} [questions] - آرایه سوالات (پیش‌فرض از Dummy.Holland_Test استفاده می‌کند)
 * @returns {Object} - نتیجه تحلیل کامل آزمون هالند
 */
function analyzeHolland(answers, questions = Dummy.Holland_Test) {
  // 1. تعریف ویژگی‌های شش‌گانه هالند
  const traits = ["R", "I", "A", "S", "E", "C"];
  const traitNames = {
    R: "واقع‌گرا",
    I: "جستجوگر",
    A: "هنری",
    S: "اجتماعی",
    E: "متهور",
    C: "قراردادی",
  };

  // 2. مقداردهی اولیه امتیازات
  const scores = traits.reduce((acc, trait) => ({ ...acc, [trait]: 0 }), {});

  // 3. محاسبه امتیازات بر اساس پاسخ‌های "بله"
  answers.forEach(({ questionId, answer }) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && answer === "بله") {
      scores[question.type] += 1;
    }
  });

  // 4. محاسبه درصدهای نرمال‌شده
  const totalQuestions = answers.length;
  const normalizedScores = Object.fromEntries(
    Object.entries(scores).map(([trait, score]) => [
      trait,
      Math.round((score / totalQuestions) * 100),
    ])
  );

  // 5. تعیین ویژگی‌های غالب
  const maxScore = Math.max(...Object.values(scores));
  const dominantTraits = Object.entries(scores)
    .filter(([_, score]) => score === maxScore && score > 0)
    .map(([trait]) => trait);

  // 6. تعیین کد سه‌حرفی هالند (ترتیب بر اساس امتیاز)
  const hollandCode = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)
    .slice(0, 3)
    .map(([trait]) => trait)
    .join("");

  // 7. اطلاعات توصیفی هر ویژگی
  const traitDetails = {
    R: {
      name: "واقع‌گرا",
      description: "علاقه به کارهای فنی، مکانیکی و فعالیت‌های عملی",
      careers: "مکانیک، برقکار، مهندسی عمران",
    },
    I: {
      name: "جستجوگر",
      description: "علاقه به مشاهده، یادگیری و حل مسائل علمی",
      careers: "پزشک، پژوهشگر، فیزیکدان",
    },
    A: {
      name: "هنری",
      description: "علاقه به کارهای خلاقانه و بیان فردی",
      careers: "هنرمند، موسیقیدان، طراح",
    },
    S: {
      name: "اجتماعی",
      description: "علاقه به کمک، آموزش و خدمت به دیگران",
      careers: "معلم، مددکار اجتماعی، مشاور",
    },
    E: {
      name: "متهور",
      description: "علاقه به رهبری، متقاعد کردن و کارهای تجاری",
      careers: "مدیر، بازاریاب، کارآفرین",
    },
    C: {
      name: "قراردادی",
      description: "علاقه به کارهای منظم، ساختاریافته و اداری",
      careers: "حسابدار، منشی، بانکدار",
    },
  };

  // 8. آماده‌سازی خروجی حرفه‌ای
  return {
    // اطلاعات پایه
    hollandCode, // کد سه‌حرفی (مثال: "RIS")
    dominantTraits, // ویژگی‌های غالب

    // داده‌های امتیازی
    rawScores: scores, // امتیازات خام
    normalizedScores, // امتیازات درصدی

    // اطلاعات هر ویژگی
    traits: Object.fromEntries(
      traits.map((trait) => [
        trait,
        {
          ...traitDetails[trait],
          score: scores[trait],
          percentage: normalizedScores[trait],
          isDominant: dominantTraits.includes(trait),
        },
      ])
    ),

    // پیشنهادات شغلی
    careerSuggestions: dominantTraits.map((t) => traitDetails[t].careers),

    // داده‌های نمودار
    chartData: {
      labels: traits.map((t) => traitDetails[t].name),
      datasets: [
        {
          label: "پروفایل هالند",
          data: traits.map((t) => normalizedScores[t]),
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)", // R
            "rgba(54, 162, 235, 0.7)", // I
            "rgba(255, 206, 86, 0.7)", // A
            "rgba(75, 192, 192, 0.7)", // S
            "rgba(153, 102, 255, 0.7)", // E
            "rgba(255, 159, 64, 0.7)", // C
          ],
        },
      ],
    },

    // خلاصه تحلیل
    summary: `تیپ شغلی شما ${hollandCode} (${dominantTraits
      .map((t) => traitDetails[t].name)
      .join("/")}) است`,

    // زمان تحلیل
    analyzedAt: new Date().toISOString(),
  };
}
// مثال خروجی:
/*
{
  hollandCode: "RIS",
  dominantTraits: ["R", "I", "S"],
  rawScores: { R: 8, I: 7, A: 3, S: 7, E: 2, C: 4 },
  normalizedScores: { R: 32, I: 28, A: 12, S: 28, E: 8, C: 16 },
  traits: {
    R: {
      name: "واقع‌گرا",
      description: "...",
      careers: "...",
      score: 8,
      percentage: 32,
      isDominant: true
    },
    // ... سایر ویژگی‌ها
  },
  careerSuggestions: ["مکانیک، برقکار، مهندسی عمران", "پزشک، پژوهشگر، فیزیکدان", "معلم، مددکار اجتماعی، مشاور"],
  chartData: { ... },
  summary: "تیپ شغلی شما RIS (واقع‌گرا/جستجوگر/اجتماعی) است",
  analyzedAt: "2023-07-20T12:34:56.789Z"
}
*/
//#endregion

//#region GARDNER
/**
 * تحلیل آزمون هوش‌های چندگانه گاردنر
 * @param {Array} answers - آرایه پاسخ‌ها به فرمت [{questionId: number, value: number}]
 * @param {Array} [questions] - آرایه سوالات (پیش‌فرض از Dummy.Gardner_Test استفاده می‌کند)
 * @returns {Object} - نتیجه تحلیل کامل هوش‌های چندگانه
 */
function analyzeGardner(answers, questions = Dummy.Gardner_Test) {
  // 1. تعریف انواع هوش‌های گاردنر
  const intelligences = {
    L: {
      code: "L",
      name: "کلامی-زبانی",
      englishName: "Linguistic",
      description: "توانایی استفاده مؤثر از کلمات و زبان",
      characteristics: "علاقه به خواندن، نوشتن، داستان‌گویی و حفظ کردن",
      careers: "نویسنده، شاعر، روزنامه‌نگار، وکیل",
    },
    M: {
      code: "M",
      name: "منطقی-ریاضی",
      englishName: "Logical-Mathematical",
      description: "توانایی استدلال، حل مسئله و تفکر منطقی",
      characteristics: "علاقه به الگوها، روابط، مسائل انتزاعی و محاسبات",
      careers: "ریاضیدان، دانشمند، برنامه‌نویس، مهندس",
    },
    S: {
      code: "S",
      name: "فضایی",
      englishName: "Spatial",
      description: "توانایی درک و تجسم فضایی",
      characteristics: "قوی در تصویرسازی ذهنی، جهتیابی و طراحی",
      careers: "معمار، نقاش، طراح، عکاس",
    },
    B: {
      code: "B",
      name: "بدنی-جنبشی",
      englishName: "Bodily-Kinesthetic",
      description: "توانایی کنترل حرکات بدن و دستکاری اشیاء",
      characteristics: "هماهنگی عالی بدن، لمس یادگیرنده، مهارت‌های فیزیکی",
      careers: "ورزشکار، جراح، صنعتگر، رقصنده",
    },
    Mu: {
      code: "Mu",
      name: "موسیقایی",
      englishName: "Musical",
      description: "حساسیت به ریتم، صداها و موسیقی",
      characteristics: "شنوایی قوی، تشخیص الگوهای صوتی، حساسیت به تن صدا",
      careers: "موسیقیدان، آهنگساز، خواننده، تنظیم کننده",
    },
    I: {
      code: "I",
      name: "میان‌فردی",
      englishName: "Interpersonal",
      description: "توانایی درک و تعامل مؤثر با دیگران",
      characteristics: "مهارت‌های اجتماعی بالا، همدلی، رهبری",
      careers: "معلم، روانشناس، فروشنده، مدیر",
    },
    In: {
      code: "In",
      name: "درون‌فردی",
      englishName: "Intrapersonal",
      description: "خودآگاهی و درک عمیق از خود",
      characteristics: "درون‌گرا، خوداندیش، آگاه از احساسات و انگیزه‌ها",
      careers: "فیلسوف، مشاور، نظریه‌پرداز، پژوهشگر",
    },
    N: {
      code: "N",
      name: "طبیعت‌گرا",
      englishName: "Naturalistic",
      description: "توانایی تشخیص و طبقه‌بندی الگوهای طبیعی",
      characteristics: "علاقه به طبیعت، گیاهان، حیوانات و سیستم‌های طبیعی",
      careers: "زیست‌شناس، زمین‌شناس، باغبان، محیط‌بان",
    },
  };

  // 2. مقداردهی اولیه امتیازات
  const scores = Object.keys(intelligences).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  // 3. محاسبه امتیازات
  answers.forEach(({ questionId, value }) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && scores.hasOwnProperty(question.type)) {
      scores[question.type] += value;
    }
  });

  // 4. محاسبه درصدهای نرمال‌شده
  const maxPossibleScore = questions.length * 5; // فرض: مقیاس 1-5 برای هر سوال
  const normalizedScores = Object.fromEntries(
    Object.entries(scores).map(([type, score]) => [
      type,
      Math.round((score / maxPossibleScore) * 100),
    ])
  );

  // 5. تعیین هوش‌های برتر
  const maxScore = Math.max(...Object.values(scores));
  const topIntelligences = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([type]) => type);

  // 6. آماده‌سازی خروجی حرفه‌ای
  return {
    // اطلاعات پایه
    topIntelligences, // کدهای هوش‌های برتر
    primaryIntelligence: topIntelligences[0], // هوش غالب اول

    // داده‌های امتیازی
    rawScores: scores, // امتیازات خام
    normalizedScores, // امتیازات درصدی

    // اطلاعات هر هوش
    intelligenceProfiles: Object.fromEntries(
      Object.entries(intelligences).map(([type, data]) => [
        type,
        {
          ...data,
          score: scores[type],
          percentage: normalizedScores[type],
          isTop: topIntelligences.includes(type),
          rank:
            Object.values(scores)
              .sort((a, b) => b - a)
              .indexOf(scores[type]) + 1,
        },
      ])
    ),

    // پیشنهادات توسعه‌ای
    developmentSuggestions: topIntelligences.map((type) => ({
      intelligence: intelligences[type].name,
      suggestions: [
        `تمرین‌های تقویت ${intelligences[type].name}`,
        `مطالعه در مورد ${intelligences[type].careers.split("، ")[0]}`,
        `شرکت در کارگاه‌های مرتبط با ${intelligences[type].name}`,
      ],
    })),

    // داده‌های نمودار
    chartData: {
      labels: Object.values(intelligences).map((i) => i.name),
      datasets: [
        {
          label: "پروفایل هوش‌های چندگانه",
          data: Object.keys(intelligences).map((key) => normalizedScores[key]),
          backgroundColor: [
            "rgba(54, 162, 235, 0.7)", // کلامی
            "rgba(255, 99, 132, 0.7)", // منطقی
            "rgba(255, 206, 86, 0.7)", // فضایی
            "rgba(75, 192, 192, 0.7)", // بدنی
            "rgba(153, 102, 255, 0.7)", // موسیقایی
            "rgba(255, 159, 64, 0.7)", // میان‌فردی
            "rgba(199, 199, 199, 0.7)", // درون‌فردی
            "rgba(83, 102, 255, 0.7)", // طبیعت‌گرا
          ],
        },
      ],
    },

    // خلاصه تحلیل
    summary: `هوش‌های برتر شما: ${topIntelligences
      .map((t) => intelligences[t].name)
      .join("، ")}`,

    // زمان تحلیل
    analyzedAt: new Date().toISOString(),
  };
}

// مثال خروجی:
/*
{
  topIntelligences: ['I', 'Mu', 'L'],
  primaryIntelligence: 'I',
  rawScores: { L: 18, M: 12, S: 10, B: 8, Mu: 17, I: 18, In: 14, N: 11 },
  normalizedScores: { L: 72, M: 48, S: 40, B: 32, Mu: 68, I: 72, In: 56, N: 44 },
  intelligenceProfiles: {
    L: {
      code: "L",
      name: "کلامی-زبانی",
      englishName: "Linguistic",
      description: "...",
      characteristics: "...",
      careers: "...",
      score: 18,
      percentage: 72,
      isTop: true,
      rank: 1
    },
    // ... سایر هوش‌ها
  },
  developmentSuggestions: [
    {
      intelligence: "میان‌فردی",
      suggestions: [
        "تمرین‌های تقویت میان‌فردی",
        "مطالعه در مورد معلم",
        "شرکت در کارگاه‌های مرتبط با میان‌فردی"
      ]
    },
    // ... سایر پیشنهادات
  ],
  chartData: { ... },
  summary: "هوش‌های برتر شما: میان‌فردی، موسیقایی، کلامی-زبانی",
  analyzedAt: "2023-07-20T12:34:56.789Z"
}
*/
//#endregion

//#region CLIFTON
/**
 * تحلیل آزمون کلیفتون استرنث (CliftonStrengths)
 * @param {Array} answers - آرایه پاسخ‌ها به فرمت [{questionId: number, choice: "A"|"B"}]
 * @param {Array} [questions] - آرایه سوالات (پیش‌فرض از Dummy.Clifton_Test استفاده می‌کند)
 * @returns {Object} - نتیجه تحلیل کامل نقاط قوت کلیفتون
 */
function analyzeClifton(answers, questions = Dummy.Clifton_Test) {
  // 1. تعریف تم‌های کلیفتون استرنث
  const themes = {
    Achiever: {
      name: "دستاوردگرا",
      description: "دارای نیاز درونی شدید به پیشرفت و موفقیت",
      characteristics: "پرانرژی، مسئولیت‌پذیر، عاشق چالش‌های جدید",
    },
    Activator: {
      name: "فعال‌ساز",
      description: "توانایی تبدیل افکار به اقدامات عملی",
      characteristics: "بی‌تاب، عملگرا، آغازگر تغییرات",
    },
    // ... سایر تم‌ها را اینجا اضافه کنید
  };

  // 2. مقداردهی اولیه امتیازات
  const scores = {};
  questions.forEach((q) => {
    scores[q.theme_a] = 0;
    scores[q.theme_b] = 0;
  });

  // 3. محاسبه امتیازات
  answers.forEach(({ questionId, choice }) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (choice === "A") scores[question.theme_a]++;
    if (choice === "B") scores[question.theme_b]++;
  });

  // 4. محاسبه درصدهای نرمال‌شده
  const totalQuestions = answers.length;
  const normalizedScores = Object.fromEntries(
    Object.entries(scores).map(([theme, score]) => [
      theme,
      Math.round((score / totalQuestions) * 100),
    ])
  );

  // 5. تعیین تم‌های برتر
  const maxScore = Math.max(...Object.values(scores));
  const topThemes = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([theme]) => theme);

  // 6. رتبه‌بندی تمام تم‌ها
  const rankedThemes = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([theme], index) => ({
      theme,
      rank: index + 1,
      ...themes[theme],
    }));

  // 7. آماده‌سازی خروجی حرفه‌ای
  return {
    // اطلاعات پایه
    topThemes, // تم‌های برتر
    signatureTheme: topThemes[0], // تم امضای شخصیتی

    // داده‌های امتیازی
    rawScores: scores, // امتیازات خام
    normalizedScores, // امتیازات درصدی

    // اطلاعات هر تم
    themeDetails: rankedThemes.map((theme) => ({
      ...theme,
      score: scores[theme.theme],
      percentage: normalizedScores[theme.theme],
      isTop: topThemes.includes(theme.theme),
    })),

    // پیشنهادات توسعه‌ای
    developmentSuggestions: topThemes.map((theme) => ({
      theme: themes[theme].name,
      suggestions: [
        `تمرکز بر پروژه‌هایی که نیاز به ${themes[theme].name} دارند`,
        `همکاری با افرادی که مکمل ${themes[theme].name} هستند`,
        `ثبت دستاوردهای مرتبط با ${themes[theme].name}`,
      ],
    })),

    // داده‌های نمودار
    chartData: {
      labels: rankedThemes.map((t) => themes[t.theme]?.name || t.theme),
      datasets: [
        {
          label: "پروفایل نقاط قوت",
          data: rankedThemes.map((t) => normalizedScores[t.theme]),
          backgroundColor: rankedThemes.map(
            (_, i) => `hsl(${(i * 360) / rankedThemes.length}, 70%, 60%)`
          ),
        },
      ],
    },

    // خلاصه تحلیل
    summary: `نقاط قوت برتر شما: ${topThemes
      .map((t) => themes[t]?.name || t)
      .join("، ")}`,

    // اطلاعات زمانی
    analyzedAt: new Date().toISOString(),
  };
}

// مثال خروجی:
/*
{
  topThemes: ["Achiever", "Activator"],
  signatureTheme: "Achiever",
  rawScores: {
    "Achiever": 8,
    "Activator": 8,
    "Adaptability": 5,
    // ... سایر تم‌ها
  },
  normalizedScores: {
    "Achiever": 80,
    "Activator": 80,
    "Adaptability": 50,
    // ... سایر تم‌ها
  },
  themeDetails: [
    {
      theme: "Achiever",
      name: "دستاوردگرا",
      description: "...",
      characteristics: "...",
      rank: 1,
      score: 8,
      percentage: 80,
      isTop: true
    },
    // ... سایر تم‌ها
  ],
  developmentSuggestions: [
    {
      theme: "دستاوردگرا",
      suggestions: [
        "تمرکز بر پروژه‌هایی که نیاز به دستاوردگرا دارند",
        "همکاری با افرادی که مکمل دستاوردگرا هستند",
        "ثبت دستاوردهای مرتبط با دستاوردگرا"
      ]
    },
    // ... سایر پیشنهادات
  ],
  chartData: { ... },
  summary: "نقاط قوت برتر شما: دستاوردگرا، فعال‌ساز",
  analyzedAt: "2023-07-20T12:34:56.789Z"
}
*/
//#endregion

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
