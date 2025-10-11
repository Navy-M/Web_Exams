export const Test_Cards = [
  {
    id: "DISC",
    icon: "/icons/disc.png",
    name: "آزمون DISC",
    description: "شخصیت خود را از طریق مدل DISC بشناسید.",
    type: "personality",
    questionFormat: "multipleChoiceTrait", // Options with associated traits
    createdAt: "2025-05-29T11:11:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 8, to: 9 },
  },

  {
    id: "HOLLAND",
    icon: "/icons/holland.png",
    name: "آزمون هالند",
    description: "تیپ شغلی خود را با آزمون هالند شناسایی کنید.",
    type: "interest",
    questionFormat: "yesNo",
    createdAt: "2025-05-13T04:14:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 11, to: 12 },
  },

  {
    id: "GARDNER",
    icon: "/icons/gardner.png",
    name: "آزمون هوش‌های چندگانه گاردنر",
    description: "سطح هوش‌های مختلف خود را ارزیابی کنید.",
    type: "intelligence",
    questionFormat: "likert",
    createdAt: "2025-05-05T16:11:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 13, to: 14 },
  },

  {
    id: "MBTI",
    icon: "/icons/mbti.png",
    name: "آزمون MBTI",
    description: "با شاخص تیپ‌های مایرز-بریگز، تیپ شخصیتی خود را بشناسید.",
    type: "personality",
    questionFormat: "eitherOr",
    createdAt: "2025-05-20T23:12:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 16, to: 17 },
  },

  {
    id: "CLIFTON",
    icon: "/icons/clifton.png",
    name: "آزمون نقاط قوت کلیفتون",
    description:
      "نقاط قوت غالب خود را با استفاده از ارزیابی کلیفتون شناسایی کنید.",
    type: "strengths",
    questionFormat: "pairedStatementChoice", // Two statements per question, choose one
    createdAt: "2025-06-03T11:11:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 14, to: 15 }, // Typically takes a bit longer than DISC
  },
  {
    id: "GHQ",
    icon: "/icons/ghq.png",
    name: "آزمون سلامت عمومی (GHQ)",
    description:
      "سلامت روان و عمومی خود را با پرسشنامه سلامت عمومی ارزیابی کنید.",
    type: "psychological",
    questionFormat: "likert", // Likert-scale questions for health assessment
    createdAt: "2025-07-01T10:00:00.000+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 2, to: 3 },
  },
  {
    id: "PERSONAL_FAVORITES",
    icon: "/icons/personal_favorites.png",
    name: "آزمون اولویت‌های شخصی",
    description: "علایق و اولویت‌های شخصی خود را شناسایی کنید.",
    type: "interest",
    questionFormat: "multipleChoice", // Choose from a list of preferences
    createdAt: "2025-07-10T14:30:00.000+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 2, to: 3 },
  },
];

export const jobRequirements = {
  "ناوبری و فرماندهی کشتی": {
    disc: ["High D", "High C"],
    mbti: ["INTJ", "ENTJ", "ISTJ"],
    holland: ["I", "C", "E"],
    gardner: ["S", "M", "L"],
    clifton: ["Responsibility", "Command", "Analytical", "Context"],
  },
  "مهندسی مکانیک و موتور دریایی": {
    disc: ["High C", "High S"],
    mbti: ["ISTP", "ESTJ", "INTJ"],
    holland: ["R", "I"],
    gardner: ["M", "B"],
    clifton: ["Executing", "Restorative", "Deliberative", "Thinking"],
  },
  "مهندسی برق و الکترونیک دریایی": {
    disc: ["High C", "High D"],
    mbti: ["INTP", "ENTJ"],
    holland: ["C", "I"],
    gardner: ["S", "M"],
    clifton: ["Executing", "Discpline", "Ideation", "Thinking"],
  },
  "تفنگدار دریایی": {
    disc: ["High D", "High I"],
    mbti: ["ISTP", "ESTP"],
    holland: ["R", "E"],
    gardner: ["I", "B"],
    clifton: ["Executing", "Achiever", "Consistency"],
  },
  "کمیسر دریایی": {
    disc: ["High I", "High S"],
    mbti: ["ESFJ", "ESTJ"],
    holland: ["E", "C"],
    gardner: ["L", "I"],
    clifton: ["Influencing", "Relator", "Connectedness", "Adaptability"],
  },
};
