const chatGPTService = require("./chatgptService");
const logger = require("../utils/logger");

/**
 * Analysis Service - Handles answer analysis and evaluation
 */
class AnalysisService {
  /**
   * Analyze answer using ChatGPT
   * @param {Object} interview - Interview object
   * @param {Object} question - Question object
   * @param {string} answer - Candidate's answer
   * @param {Object} proctoringData - Proctoring data
   * @returns {Promise<Object>} Analysis result
   */
  static async analyzeAnswer(interview, question, answer, proctoringData) {
    const prompt = `Analyze the following interview answer and provide detailed feedback.

QUESTION: ${question.question}
EXPECTED ANSWER: ${question.expectedAnswer}
CANDIDATE ANSWER: ${answer}

PROCTORING DATA:
- Time Spent: ${proctoringData.timeSpent} seconds
- Tab Switches: ${proctoringData.tabSwitches || 0}
- Copy/Paste Count: ${proctoringData.copyPasteCount || 0}
- Face Detection: ${proctoringData.faceDetection ? "Detected" : "Not detected"}
- Mobile Detection: ${
      proctoringData.mobileDetection ? "Detected" : "Not detected"
    }

Analyze the answer and provide scores (0-10) and feedback in JSON format:
{
  "relevance": 8.5,
  "completeness": 7.0,
  "technicalAccuracy": 8.0,
  "communication": 7.5,
  "overallRating": 7.8,
  "feedback": "Detailed feedback about the answer...",
  "strengths": ["Good technical knowledge", "Clear communication"],
  "areasForImprovement": ["Could provide more specific examples", "Needs more detail on implementation"]
}`;

    try {
      const response = await chatGPTService.generateResponse(prompt);
      const analysis = JSON.parse(response);

      return {
        success: true,
        analysis: analysis,
      };
    } catch (error) {
      logger.error("Error analyzing answer:", error);
      return {
        success: false,
        analysis: {
          relevance: 5.0,
          completeness: 5.0,
          technicalAccuracy: 5.0,
          communication: 5.0,
          overallRating: 5.0,
          feedback: "Analysis could not be completed due to technical issues.",
          strengths: [],
          areasForImprovement: ["Technical analysis unavailable"],
        },
      };
    }
  }

  /**
   * Generate follow-up question based on previous answer
   * @param {Object} interview - Interview object
   * @param {Object} previousQuestion - Previous question object
   * @param {string} answer - Previous answer
   * @param {number} questionIndex - Current question index
   * @returns {Object} Generated follow-up question
   */
  static async generateFollowUpQuestion(
    interview,
    previousQuestion,
    answer,
    questionIndex
  ) {
    const safeQuestionIndex =
      typeof questionIndex === "number" && !isNaN(questionIndex)
        ? questionIndex
        : 0;

    const prompt = `Generate a follow-up question for an interview.

PREVIOUS QUESTION: ${previousQuestion.question}
CANDIDATE ANSWER: ${answer}
INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Interview Type: ${interview.interviewType}
- Experience Level: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}
- Resume: ${interview.resumeId.resumeText.substring(0, 1000)}...

Generate a relevant follow-up question that:
1. Builds on the previous answer
2. Goes deeper into the topic
3. Tests different aspects of their knowledge
4. Is appropriate for their experience level
5. Is a natural progression from the previous question

Respond with JSON format:
{
  "questionId": "followup_${safeQuestionIndex + 1}",
  "question": "The follow-up question",
  "category": "Technical Skills",
  "difficulty": "medium",
  "expectedAnswer": "Expected answer format"
}`;

    try {
      const response = await chatGPTService.generateResponse(prompt);
      const questionData = JSON.parse(response.content);

      return {
        questionId:
          questionData.questionId || `followup_${safeQuestionIndex + 1}`,
        question: questionData.question,
        category: questionData.category || "Follow-up",
        difficulty: questionData.difficulty || "medium",
        expectedAnswer:
          questionData.expectedAnswer ||
          "Candidate should provide a detailed response building on their previous answer",
      };
    } catch (error) {
      logger.error("Error generating follow-up question:", error);

      // Fallback question
      return {
        questionId: `followup_${safeQuestionIndex + 1}`,
        question:
          "Can you elaborate more on that point? What specific challenges did you face and how did you overcome them?",
        category: "Follow-up",
        difficulty: "medium",
        expectedAnswer:
          "Candidate should provide more details about their previous answer",
      };
    }
  }

  /**
   * Generate introduction question with interviewer bio and candidate data
   * @param {Object} interview - Interview object
   * @param {string} candidateName - Candidate's name
   * @returns {Object} Generated question data
   */
  static async generateIntroductionQuestion(interview, candidateName) {
    const interviewerName = interview?.interviewer?.name || "AI Interviewer";
    const interviewerExperience =
      interview?.interviewer?.experience || "5+ years";
    const interviewerBio =
      interview?.interviewer?.bio || "Experienced professional";
    const noOfInterviewsTaken =
      interview?.interviewer?.numberOfInterviewers || 1;
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
  }
}

module.exports = AnalysisService;
