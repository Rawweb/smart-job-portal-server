import skillsList from './skillsList.js';

export const extractSkills = (text) => {
  if (!text) return [];

  const found = skillsList.filter((skill) => {
    // Escape special regex characters in skill names (e.g. C++, Node.js)
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match whole word only — prevents "R" matching "React"
    const regex = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i');
    return regex.test(text);
  });

  // Remove duplicates
  return [...new Set(found)];
};
