const { chatGPTService, logger } = require("./dependencies");

/**
 * Analyze answer using ChatGPT
 * @param {Object} interview - Interview object
 * @param {Object} question - Question object
 * @param {string} answer - Candidate's answer
 * @param {Object} proctoringData - Proctoring data
 * @returns {Promise<Object>} Analysis result
 */
const analyzeAnswer = async (interview, question, answer, proctoringData) => {
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
};

module.exports = analyzeAnswer;

