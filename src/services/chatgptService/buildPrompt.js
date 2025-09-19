const {
  getDifficultyDescription,
  getLevelDescription,
  getInterviewTypeDescription,
} = require("./promptHelpers");

/**
 * Builxd the prompt for ChatGPT
 * @param {Object} params - Parameters for prompt building
 * @returns {string} The formatted prompt
 */
const buildPrompt = ({
  resumeText,
  interviewType,
  level,
  difficultyLevel,
  jobRole,
}) => {
  const difficultyDescription = getDifficultyDescription(difficultyLevel);
  const levelDescription = getLevelDescription(level);
  const interviewTypeDescription = getInterviewTypeDescription(interviewType);

  return `Based on the following resume and interview parameters, generate 8 high-quality interview questions.

RESUME:
${resumeText}

INTERVIEW PARAMETERS:
- Job Role: ${jobRole}
- Interview Type: ${interviewTypeDescription}
- Experience Level: ${levelDescription}
- Difficulty Level: ${difficultyDescription}

REQUIREMENTS:
1. Generate exactly 8 questions
2. Questions should be relevant to the candidate's resume and experience
3. Mix of different question types (conceptual, practical, scenario-based)
4. Questions should match the difficulty level and experience level
5. Include relevant keywords that candidates should mention in their answers
6. Provide comprehensive expected answers that show what a good candidate response looks like

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "questionId": "q1",
      "question": "What are React Hooks, and can you explain a situation where you used useEffect and useMemo in a project?",
      "category": "Technical Skills",
      "expectedAnswer": "React Hooks are functions that allow developers to use state and lifecycle features in functional components without writing a class. Two commonly used hooks are useEffect and useMemo. In one of my projects, I worked on a dashboard where real-time data was being fetched from an API every few seconds. I used useEffect to set up the data-fetching interval and clean it up when the component unmounted, ensuring no memory leaks. For performance optimization, I used useMemo to memoize expensive calculations, such as filtering large data sets, so that the function did not recompute unless the data actually changed. This significantly reduced unnecessary re-renders and improved the performance of the app. By combining these hooks, I was able to keep the code cleaner, more readable, and more efficient, which impressed both my team and the client.",
      "keywords": ["React", "Hooks", "useEffect", "useMemo", "Performance Optimization"]
    }
  ]
}


IMPORTANT:
- Make questions specific to the candidate's background
- Ensure keywords are relevant and commonly used in the field
- Expected answers should be detailed and show depth of understanding
- Categories should be relevant (e.g., "Technical Skills", "Problem Solving", "System Design", "Leadership", etc.)
- Questions should progressively increase in complexity
- Include both theoretical and practical questions

Generate the questions now:`;
};

module.exports = buildPrompt;



