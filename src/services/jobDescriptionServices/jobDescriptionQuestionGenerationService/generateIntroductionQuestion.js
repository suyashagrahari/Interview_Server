const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate introduction question with interviewer bio and job description data
 * @param {Object} interview - Interview object (with populated jobDescriptionId)
 * @param {string} candidateName - Candidate's name
 * @returns {Object} Generated question data
 */
const generateIntroductionQuestion = async (interview, candidateName) => {
  const interviewerName = interview?.interviewer?.name || "AI Interviewer";
  const interviewerExperience =
    interview?.interviewer?.experience || "5+ years";
  const interviewerBio =
    interview?.interviewer?.bio || "Experienced professional";
  const noOfInterviewsTaken = interview?.interviewer?.numberOfInterviewers || 1;
  const jobRole = interview.jobRole;
  const interviewType = interview.interviewType;
  const experienceLevel = interview.level;
  const difficultyLevel = interview.difficultyLevel;
  const companyName = interview.companyName || "the company";

  // Get job description text instead of resume text
  const jobDescriptionText =
    interview.jobDescriptionId?.jdText?.substring(0, 1500) ||
    "No job description data available";

  const prompt = `
      You are an AI assistant that generates personalized interview introduction questions for job description-based interviews. Based on the following context, create an engaging and interactive introduction question.

      INTERVIEW CONTEXT:
      - Job Role: ${jobRole}
      - Company: ${companyName}
      - Interview Type: ${interviewType}
      - Experience Level Required: ${experienceLevel}
      - Difficulty Level: ${difficultyLevel}
      - Candidate Name: ${candidateName}

      JOB DESCRIPTION:
      ${jobDescriptionText}

      INTERVIEWER INFORMATION:
      - Name: ${interviewerName}
      - Experience: ${interviewerExperience}
      - Bio: ${interviewerBio}
      - Number of Interviews Conducted: ${noOfInterviewsTaken}

      TASK: Generate a personalized and engaging interviewer introduction that:
      1. Starts with "Hello ${candidateName}!" (use the actual candidate name)
      2. Introduces the interviewer with their REAL name "${interviewerName}", and actual experience details "${interviewerExperience}"
      3. Mentions 2-3 key requirements or responsibilities from the job description to set context
      4. Creates a welcoming and encouraging atmosphere
      5. Asks the candidate to introduce themselves and explain how their background aligns with the job requirements
      6. Uses a conversational, professional tone
      7. References the interviewer bio: ${interviewerBio}
      8. Mentions the company name if available

      For the expectedAnswer, provide a COMPLETE, realistic candidate response (not instructions) that:
      1. Thanks the interviewer by name
      2. Provides their full name and current role
      3. Highlights 3-4 key experiences that align with the job description requirements
      4. Mentions specific projects and achievements with numbers/metrics
      5. Shows enthusiasm for the role and explains why they're a good fit
      6. Demonstrates knowledge about the company
      7. Is 150-200 words long and sounds natural
      8. Provides a REAL example answer, not instructions on how to answer

      IMPORTANT: Return ONLY a valid JSON object in this exact format:
      {
        "questionId": "intro_1",
        "question": "Your personalized interviewer introduction mentioning job requirements and company",
        "category": "Introduction",
        "difficulty": "easy",
        "expectedAnswer": "A complete, realistic candidate response (not instructions)",
        "keywords": ["introduction", "background", "experience", "skills", "motivation", "job-fit", "personalized"]
      }

      Make sure the interviewer has a proper name and specific experience details, not generic placeholders.
    `;

  // Generate unique numeric question ID
  const generateUniqueQuestionId = () => {
    const timestamp = Date.now(); // Current timestamp
    const random = Math.floor(Math.random() * 1000); // Random number between 0-999
    return `${timestamp}${random}`; // Combine timestamp with random number for uniqueness
  };

  try {
    logger.info(
      "Calling ChatGPT service for JD-based introduction question..."
    );
    const response = await chatGPTService.generateResponse(prompt);
    logger.info("ChatGPT response received for JD introduction question");

    const questionData = JSON.parse(response);

    return {
      questionId: generateUniqueQuestionId(), // Use unique numeric ID instead of questionData.questionId
      question: questionData.question,
      category: questionData.category,
      difficulty: questionData.difficulty,
      expectedAnswer: questionData.expectedAnswer,
      keywords: questionData.keywords || [
        "introduction",
        "background",
        "experience",
        "skills",
        "motivation",
        "job-fit",
      ],
    };
  } catch (error) {
    logger.error("Error generating JD-based introduction question:", error);

    // Fallback question with interviewer, company and job description context
    const interviewerIntro = `Hello ${candidateName}! I'm ${interviewerName}, with ${interviewerExperience} of experience in the industry. I'll be conducting your interview for the ${jobRole} position at ${companyName} today.`;

    return {
      questionId: generateUniqueQuestionId(), // Use unique numeric ID
      question: `${interviewerIntro}\n\nI've reviewed the job description and I'm excited to learn about your background and experience. Could you please introduce yourself and tell me how your skills and experience align with the requirements for this ${jobRole} role?`,
      category: "Introduction",
      difficulty: "easy",
      expectedAnswer:
        "Candidate should provide a brief overview of their background, relevant experience, key skills that match the job requirements, and explain their interest in the role and company.",
      keywords: [
        "introduction",
        "background",
        "experience",
        "skills",
        "motivation",
        "job-fit",
      ],
    };
  }
};

module.exports = generateIntroductionQuestion;
