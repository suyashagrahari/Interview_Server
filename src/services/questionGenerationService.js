const QuestionPool = require("../models/QuestionPool");
const chatGPTService = require("./chatgptService");
const logger = require("../utils/logger");

/**
 * Question Generation Service - Handles all question-related operations
 */
class QuestionGenerationService {
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
   * Generate a new question from scratch
   * @param {Object} interview - Interview object
   * @param {number} questionIndex - Question index
   * @returns {Object} Generated question
   */
  static async generateNewQuestion(interview, questionIndex) {
    const prompt = `Generate a new interview question.

INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Interview Type: ${interview.interviewType}
- Experience Level: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}
- Resume: ${interview.resumeId.resumeText.substring(0, 1000)}...

Generate a relevant question that:
1. Is appropriate for the experience level and job role
2. Tests technical or behavioral skills based on interview type
3. Is different from previous questions
4. Has appropriate difficulty level

Respond with JSON format:
{
  "questionId": "q${questionIndex + 1}",
  "question": "The new question",
  "category": "Technical Skills",
  "difficulty": "medium",
  "expectedAnswer": "Expected answer format"
}`;

    try {
      const response = await chatGPTService.generateResponse(prompt);
      const questionData = JSON.parse(response);

      return {
        questionId: questionData.questionId,
        question: questionData.question,
        category: questionData.category,
        difficulty: questionData.difficulty,
        expectedAnswer: questionData.expectedAnswer,
      };
    } catch (error) {
      logger.error("Error generating new question:", error);
      throw error;
    }
  }

  /**
   * Get next question from question pool based on alternating pattern
   * @param {Object} interview - Interview object
   * @param {number} currentQuestionNumber - Current question number
   * @returns {Promise<Object>} Next question result
   */
  static async getNextQuestionFromPool(interview, currentQuestionNumber) {
    try {
      // Get question pool for this interview
      const questionPool = await QuestionPool.findOne({
        interviewId: interview._id,
        userId: interview.candidateId,
      });

      if (!questionPool || questionPool.questions.length === 0) {
        return {
          success: false,
          message: "Question pool not found",
        };
      }

      // Determine next question index based on alternating pattern
      const nextQuestionIndex = currentQuestionNumber - 1; // Convert to 0-based index
      const nextQuestion = questionPool.questions[nextQuestionIndex];

      if (!nextQuestion) {
        return {
          success: false,
          message: "No more questions available",
        };
      }

      // Check if this is a follow-up question (odd indices: 2, 4, 6, 8)
      if (nextQuestionIndex % 2 === 0 && nextQuestionIndex > 0) {
        // Generate follow-up question based on previous answer
        const previousQuestion =
          interview.questions[interview.questions.length - 1];
        const followUpQuestion = await this.generateFollowUpQuestion(
          interview,
          previousQuestion,
          previousQuestion.answer,
          nextQuestionIndex
        );

        return {
          success: true,
          question: followUpQuestion,
        };
      } else {
        // Use question from pool
        return {
          success: true,
          question: {
            questionId: nextQuestion.questionId,
            question: nextQuestion.question,
            category: nextQuestion.category,
            difficulty: nextQuestion.difficulty || "medium",
            expectedAnswer: nextQuestion.expectedAnswer,
          },
        };
      }
    } catch (error) {
      logger.error("Error getting next question from pool:", error);
      return {
        success: false,
        message: "Error getting next question",
      };
    }
  }

  /**
   * Store question in question pool at specific index
   * @param {string} interviewId - Interview ID
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @param {Object} question - Question data
   * @param {Object} interview - Interview object
   * @param {number} questionIndex - Question index
   */
  static async storeQuestionInPool(
    interviewId,
    resumeId,
    userId,
    question,
    interview,
    questionIndex = null
  ) {
    try {
      let questionPool = await QuestionPool.findOne({
        interviewId: interviewId,
      });

      if (!questionPool) {
        questionPool = new QuestionPool({
          resumeId: resumeId,
          interviewId: interviewId,
          userId: userId,
          interviewType: interview.interviewType,
          level: interview.level,
          difficultyLevel: interview.difficultyLevel,
          jobRole: interview.jobRole,
          questions: [],
        });
      }

      const questionData = {
        questionId: question.questionId,
        question: question.question,
        category: question.category,
        expectedAnswer: question.expectedAnswer,
        keywords: [], // Can be extracted from expected answer
      };

      if (questionIndex !== null) {
        // Insert at specific index
        questionPool.questions.splice(questionIndex, 0, questionData);
      } else {
        // Add to end
        questionPool.questions.push(questionData);
      }

      await questionPool.save();

      logger.info(
        `Question stored in pool at index ${
          questionIndex || questionPool.questions.length - 1
        } for interview ${interviewId}`
      );
    } catch (error) {
      logger.error("Error storing question in pool:", error);
    }
  }

  /**
   * Get questions for an interview
   * @param {string} interviewId - Interview ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Questions result
   */
  static async getQuestionsForInterview(interviewId, userId) {
    try {
      const questionPool = await QuestionPool.findOne({
        interviewId: interviewId,
        userId: userId,
      });

      if (!questionPool) {
        return {
          success: false,
          message: "Question pool not found",
        };
      }

      return {
        success: true,
        message: "Questions retrieved successfully",
        data: {
          questions: questionPool.questions,
          totalQuestions: questionPool.questions.length,
        },
      };
    } catch (error) {
      logger.error("Error getting questions for interview:", error);
      return {
        success: false,
        message: "Error retrieving questions",
      };
    }
  }
}

module.exports = QuestionGenerationService;
