const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate introduction question with interviewer bio and candidate data
 * @param {Object} interview - Interview object
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
  const resumeTextNew =
    interview.resumeId?.resumeText?.substring(0, 1000) ||
    "No resume data available";

  const prompt = `
      You are an AI assistant that generates personalized interview introduction questions. Based on the following context, create an engaging and interactive introduction question.
      
      INTERVIEW CONTEXT:     
      - Job Role: ${jobRole}     
      - Interview Type: ${interviewType}     
      - Experience Level: ${experienceLevel}     
      - Difficulty Level: ${difficultyLevel}     
      - Candidate Name: ${candidateName}     
      - Resume: ${resumeTextNew}       
      
      INTERVIEWER INFORMATION:     
      - Name: ${interviewerName}         
      - Experience: ${interviewerExperience}     
      - Bio: ${interviewerBio}     
      - numberOfInterviewers: ${noOfInterviewsTaken}        
      
      TASK: Generate a personalized and engaging interviewer introduction that:
      1. Starts with "Hello ${candidateName}!" (use the actual candidate name)
      2. Introduces the interviewer with their REAL name ${interviewerName}, and actual experience details ${interviewerExperience}
      3. Mentions 2-3 specific points from the candidate's resume to show you've reviewed it
      4. Creates a welcoming and encouraging atmosphere
      5. Asks the candidate to introduce themselves and highlight key projects
      6. Uses a conversational, professional tone
      7. Take reference from the interviewer bio ${interviewerBio}
    
      For the expectedAnswer, provide a COMPLETE, realistic candidate response (not instructions) that:
      1. Thanks the interviewer by name
      2. Provides their full name and current role
      3. Highlights 3-4 key experiences and specific projects
      4. Mentions specific achievements with numbers/metrics
      5. Shows enthusiasm for the role and company
      6. Is 150-200 words long and sounds natural
      7. give real example of the answer not you tell the way you tell the answer or introdcution in expected answer.
      
      IMPORTANT: Return ONLY a valid JSON object in this exact format:
      {
        "questionId": "intro_1",
        "question": "Your personalized interviewer introduction with candidate name and resume details",
        "category": "Introduction",
        "difficulty": "easy",
        "expectedAnswer": "A complete, realistic candidate response (not instructions)",
        "keywords": ["introduction", "background", "experience", "skills", "motivation", "personalized"]
      }
      
      Make sure the interviewer has a proper name and specific experience details, not generic placeholders.
    `;

  try {
    logger.info("Calling ChatGPT service for introduction question...");
    const response = await chatGPTService.generateResponse(prompt);
    logger.info("ChatGPT response received for introduction question");

    const questionData = JSON.parse(response);

    return {
      questionId: questionData.questionId,
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
      ],
    };
  } catch (error) {
    logger.error("Error generating introduction question:", error);

    // Fallback question with interviewer and candidate data
    const interviewerIntro = `Hello! I'm ${interviewerName}, with ${interviewerExperience} of experience. I'll be conducting your interview for the ${interview.jobRole} position today.`;

    return {
      questionId: "intro_1",
      question: `${interviewerIntro}\n\nNow, ${candidateName}, I'd like to learn more about you. Could you please tell me about your background, your professional experience, and what interests you most about this role?`,
      category: "Introduction",
      difficulty: "easy",
      expectedAnswer:
        "Candidate should provide a brief overview of their background, relevant experience, skills, and interest in the role.",
    };
  }
};

module.exports = generateIntroductionQuestion;

