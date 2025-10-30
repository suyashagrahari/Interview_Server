const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate topic-specific introduction question from resume or JD
 * @param {Object} interview - Interview object
 * @param {string} candidateName - Candidate's name
 * @param {string} topicName - Topic name (e.g., "React", "Node.js")
 * @returns {Object} Generated introduction question data
 */
const generateIntroductionQuestion = async (
  interview,
  candidateName,
  topicName
) => {
  const interviewerName = interview?.interviewer?.name || "AI Interviewer";
  const interviewerExperience =
    interview?.interviewer?.experience || "5+ years";
  const interviewerBio =
    interview?.interviewer?.bio || "Experienced professional";
  const jobRole = interview.jobRole;
  const interviewType = interview.interviewType;
  const experienceLevel = interview.level;
  const difficultyLevel = interview.difficultyLevel;

  // Get context from either resume or job description
  let contextText = "";
  let contextType = interview.interviewSourceType;

  if (contextType === "resume" && interview.resumeId) {
    contextText =
      interview.resumeId?.resumeText?.substring(0, 1000) ||
      "No resume data available";
  } else if (contextType === "job_description" && interview.jobDescriptionId) {
    contextText =
      interview.jobDescriptionId?.description?.substring(0, 1000) ||
      "No job description available";
  }

  const prompt = `
      You are an AI assistant that generates personalized topic-focused interview introduction questions.

      INTERVIEW CONTEXT:
      - Topic: ${topicName}
      - Job Role: ${jobRole}
      - Interview Type: ${interviewType}
      - Experience Level: ${experienceLevel}
      - Difficulty Level: ${difficultyLevel}
      - Candidate Name: ${candidateName}
      - Context Source: ${contextType}
      - Context: ${contextText}

      INTERVIEWER INFORMATION:
      - Name: ${interviewerName}
      - Experience: ${interviewerExperience}
      - Bio: ${interviewerBio}

      TASK: Generate a personalized and engaging interviewer introduction specifically focused on ${topicName} that:
      1. Starts with "Hello ${candidateName}!" (use the actual candidate name)
      2. Introduces the interviewer with their REAL name ${interviewerName}, and actual experience details ${interviewerExperience}
      3. Mentions that this interview will focus on ${topicName}
      4. References 2-3 specific points from the ${contextType} that relate to ${topicName}
      5. Creates a welcoming and encouraging atmosphere
      6. Asks the candidate to introduce themselves and their experience with ${topicName}
      7. Uses a conversational, professional tone
      8. Take reference from the interviewer bio ${interviewerBio}

      For the expectedAnswer, provide a COMPLETE, realistic candidate response (not instructions) that:
      1. Thanks the interviewer by name
      2. Provides their name and current role
      3. Highlights their experience with ${topicName} specifically
      4. Mentions 2-3 projects or experiences related to ${topicName}
      5. Shows enthusiasm about ${topicName} and the role
      6. Is 150-200 words long and sounds natural
      7. Give a real example answer, not instructions

      IMPORTANT: Return ONLY a valid JSON object in this exact format:
      {
        "questionId": "topic_intro_${topicName.toLowerCase().replace(/\s+/g, "_")}_1",
        "question": "Your personalized topic-focused interviewer introduction",
        "category": "Introduction - ${topicName}",
        "difficulty": "easy",
        "expectedAnswer": "A complete, realistic candidate response (not instructions)",
        "keywords": ["introduction", "${topicName}", "background", "experience", "skills", "motivation"]
      }

      Make sure the interviewer has a proper name and specific experience details, not generic placeholders.
    `;

  try {
    logger.info(
      `✅ [Topic Analysis] Calling ChatGPT for ${topicName} introduction question...`
    );
    const response = await chatGPTService.generateResponse(prompt);
    logger.info(
      `✅ [Topic Analysis] ChatGPT response received for ${topicName} introduction`
    );

    const questionData = JSON.parse(response);

    return {
      questionId: questionData.questionId,
      question: questionData.question,
      category: questionData.category,
      difficulty: questionData.difficulty,
      expectedAnswer: questionData.expectedAnswer,
      keywords: questionData.keywords || [
        "introduction",
        topicName,
        "background",
        "experience",
        "skills",
      ],
    };
  } catch (error) {
    logger.error(
      `❌ [Topic Analysis] Error generating ${topicName} introduction question:`,
      error
    );

    // Fallback question with interviewer and candidate data
    const interviewerIntro = `Hello! I'm ${interviewerName}, with ${interviewerExperience} of experience. I'll be conducting your ${topicName} interview for the ${interview.jobRole} position today.`;

    return {
      questionId: `topic_intro_${topicName.toLowerCase().replace(/\s+/g, "_")}_1`,
      question: `${interviewerIntro}\n\nNow, ${candidateName}, I'd like to learn more about your experience with ${topicName}. Could you please tell me about your background with ${topicName}, projects you've worked on, and what aspects of ${topicName} interest you most?`,
      category: `Introduction - ${topicName}`,
      difficulty: "easy",
      expectedAnswer: `Candidate should provide an overview of their ${topicName} experience, relevant projects, skills, and interest in the topic.`,
      keywords: ["introduction", topicName, "background", "experience"],
    };
  }
};

module.exports = generateIntroductionQuestion;
