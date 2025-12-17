const TopicQuestionModelFactory = require("../../models/TopicQuestion");
const logger = require("../../utils/logger");

/**
 * @desc    Upload topic questions (bulk)
 * @route   POST /api/topic-questions/upload
 * @access  Private
 */
const uploadTopicQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Questions array is required and cannot be empty",
      });
    }

    // Validate questions structure
    const validQuestions = questions.filter((question) => {
      return (
        question.topicName &&
        question.topicName.trim() &&
        question.experienceLevel &&
        question.difficultyLevel &&
        question.questionText &&
        question.questionText.trim() &&
        question.expectedAnswer &&
        question.expectedAnswer.trim()
      );
    });

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid questions provided",
      });
    }

    // Group questions by topic to handle multiple topics in one upload
    const questionsByTopic = {};
    validQuestions.forEach((question) => {
      const topicName = question.topicName.trim();
      if (!questionsByTopic[topicName]) {
        questionsByTopic[topicName] = [];
      }
      questionsByTopic[topicName].push({
        topicName: topicName,
        experienceLevel: question.experienceLevel,
        difficultyLevel: question.difficultyLevel,
        questionText: question.questionText.trim(),
        expectedAnswer: question.expectedAnswer.trim(),
        keywords: Array.isArray(question.keywords) ? question.keywords : [],
        createdAt: question.createdAt
          ? new Date(question.createdAt)
          : new Date(),
        updatedAt: new Date(),
      });
    });

    // Process each topic
    const results = [];
    for (const topicName in questionsByTopic) {
      const topicQuestions = questionsByTopic[topicName];

      // Get or create model for this topic
      const TopicModel = TopicQuestionModelFactory.getModel(topicName);

      // Insert questions
      const savedQuestions = await TopicModel.insertMany(topicQuestions, {
        ordered: false, // Continue inserting even if some fail
      });

      results.push({
        topicName,
        collectionName:
          TopicQuestionModelFactory.sanitizeCollectionName(topicName),
        count: savedQuestions.length,
      });

      logger.info(
        `Uploaded ${savedQuestions.length} questions for topic: ${topicName}`
      );
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${validQuestions.length} question(s) across ${results.length} topic(s)`,
      data: {
        totalQuestions: validQuestions.length,
        topics: results,
      },
    });
  } catch (error) {
    logger.error("Error uploading topic questions:", error);

    // Handle duplicate key errors gracefully
    if (error.code === 11000 || error.name === "BulkWriteError") {
      return res.status(200).json({
        success: true,
        message: "Some questions were already present (skipped duplicates)",
        data: {
          totalQuestions: validQuestions?.length || 0,
          topics: [],
        },
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload topic questions",
      error: error.message,
    });
  }
};

module.exports = uploadTopicQuestions;
