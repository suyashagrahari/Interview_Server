/**
 * Get difficulty level description
 * @param {string} difficultyLevel - The difficulty level
 * @returns {string} Description of the difficulty level
 */
const getDifficultyDescription = (difficultyLevel) => {
  const descriptions = {
    beginner:
      "Beginner level - Focus on basic concepts, fundamental knowledge, and entry-level understanding",
    intermediate:
      "Intermediate level - Focus on practical application, problem-solving, and moderate complexity",
    expert:
      "Expert level - Focus on advanced concepts, system design, architecture, and leadership skills",
  };
  return descriptions[difficultyLevel] || descriptions.intermediate;
};

/**
 * Get experience level description
 * @param {string} level - The experience level
 * @returns {string} Description of the experience level
 */
const getLevelDescription = (level) => {
  const descriptions = {
    "0-2":
      "0-2 years experience - Entry level, focus on fundamentals and basic practical knowledge",
    "3-4":
      "3-4 years experience - Mid-level, focus on practical experience and problem-solving",
    "5-6":
      "5-6 years experience - Senior level, focus on advanced skills and mentoring",
    "7-8":
      "7-8 years experience - Lead level, focus on architecture and team leadership",
    "9-10":
      "9-10+ years experience - Principal/Staff level, focus on system design and strategic thinking",
  };
  return descriptions[level] || descriptions["3-4"];
};

/**
 * Get interview type description
 * @param {string} interviewType - The interview type
 * @returns {string} Description of the interview type
 */
const getInterviewTypeDescription = (interviewType) => {
  const descriptions = {
    technical:
      "Technical interview - Focus on technical skills, coding, system design, and problem-solving",
    behavioral:
      "Behavioral interview - Focus on soft skills, past experiences, leadership, and cultural fit",
  };
  return descriptions[interviewType] || descriptions.technical;
};

module.exports = {
  getDifficultyDescription,
  getLevelDescription,
  getInterviewTypeDescription,
};

