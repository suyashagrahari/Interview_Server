const { QuestionPool, logger } = require("./dependencies");

/**
 * Store question in question pool at specific index
 * @param {string} interviewId - Interview ID
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @param {Object} question - Question data
 * @param {Object} interview - Interview object
 * @param {number} questionIndex - Question index
 */
const storeQuestionInPool = async (
  interviewId,
  resumeId,
  userId,
  question,
  interview,
  questionIndex = null
) => {
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
};

module.exports = storeQuestionInPool;

