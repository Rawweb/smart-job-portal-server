// This function is pure — it takes two arrays and returns a result
// No database calls, no side effects, just calculation
// That makes it easy to test and reuse anywhere
const calculateSkillGap = (graduateSkills = [], requiredSkills = []) => {
  // If the job has no required skills listed, anyone qualifies
  if (!requiredSkills || requiredSkills.length === 0) {
    return {
      compatibilityScore: 100,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  // Normalize everything to lowercase before comparing
  // This means "JavaScript" and "javascript" count as the same skill
  const normalizedGraduateSkills = graduateSkills.map((s) =>
    s.toLowerCase().trim()
  );

  // matchedSkills: required skills the graduate actually has
  // We keep the original casing from requiredSkills so the UI looks clean
  const matchedSkills = requiredSkills.filter((skill) =>
    normalizedGraduateSkills.includes(skill.toLowerCase().trim())
  );

  // missingSkills: required skills the graduate does NOT have
  const missingSkills = requiredSkills.filter(
    (skill) => !normalizedGraduateSkills.includes(skill.toLowerCase().trim())
  );

  // Score = how many required skills they have / total required * 100
  // Math.round removes decimals — 72.6 becomes 73
  const compatibilityScore = Math.round(
    (matchedSkills.length / requiredSkills.length) * 100
  );

  return {
    compatibilityScore,
    matchedSkills,
    missingSkills,
  };
};

export default calculateSkillGap;
