export const LEVELS = [
  { name: "مبتدئ", min: 0, max: 99 },
  { name: "طالب مجتهد", min: 100, max: 299 },
  { name: "متعلم نشيط", min: 300, max: 599 },
  { name: "متفوق", min: 600, max: 999 },
  { name: "متميز", min: 1000, max: 1499 },
  { name: "خبير تمريض", min: 1500, max: 2499 },
  { name: "محترف", min: 2500, max: 3999 },
  { name: "أسطورة بوابة التمريض", min: 4000, max: 5999 },
  { name: "النخبة", min: 6000, max: 9999 },
  { name: "القمة", min: 10000, max: Infinity }
];

export const BADGES = [
  { id: "first_exam", title: "أول اختبار", description: "الحصول على أول مكافأة من اختبار معتمد", icon: "📝", test: ({ examCount }) => examCount >= 1 },
  { id: "perfect_exam", title: "العقل المتميز", description: "تحقيق 100% في اختبار معتمد", icon: "🧠", test: ({ perfectExam }) => perfectExam },
  { id: "challenge_10", title: "بطل التحديات", description: "حل 10 تحديات يومية صحيحة ومعتمدة", icon: "🏆", test: ({ challengeCount }) => challengeCount >= 10 },
  { id: "xp_100", title: "بداية قوية", description: "جمع 100 نقطة خبرة", icon: "⭐", test: ({ xp }) => xp >= 100 },
  { id: "xp_500", title: "صاحب عزيمة", description: "جمع 500 نقطة خبرة", icon: "💎", test: ({ xp }) => xp >= 500 },
  { id: "xp_1000", title: "المتفوق", description: "جمع 1000 نقطة خبرة", icon: "🥇", test: ({ xp }) => xp >= 1000 },
  { id: "xp_2500", title: "المحترف", description: "جمع 2500 نقطة خبرة", icon: "🎖️", test: ({ xp }) => xp >= 2500 },
  { id: "xp_5000", title: "أسطورة البوابة", description: "جمع 5000 نقطة خبرة", icon: "👑", test: ({ xp }) => xp >= 5000 }
];

export function getLevel(value = 0) {
  const xp = Math.max(0, Number(value) || 0);
  const index = LEVELS.findIndex(level => xp >= level.min && xp <= level.max);
  const current = LEVELS[index < 0 ? LEVELS.length - 1 : index];
  const next = LEVELS[index + 1] || null;
  const progress = next ? Math.max(0, Math.min(100, ((xp - current.min) / (next.min - current.min)) * 100)) : 100;
  return { ...current, next, progress: Math.round(progress), remaining: next ? Math.max(0, next.min - xp) : 0 };
}

export function getExamXp(percentage = 0) {
  const score = Number(percentage) || 0;
  if (score >= 95) return 40;
  if (score >= 85) return 30;
  if (score >= 70) return 20;
  if (score >= 50) return 10;
  return 0;
}
