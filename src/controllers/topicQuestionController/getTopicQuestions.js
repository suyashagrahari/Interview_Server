const TopicQuestionModelFactory = require("../../models/TopicQuestion");
const logger = require("../../utils/logger");

/**
 * @desc    Get questions for a specific topic
 * @route   GET /api/topic-questions/:topicName
 * @access  Public
 */
const getTopicQuestions = async (req, res) => {
  try {
    const { topicName } = req.params;
    const {
      page = 1,
      limit = 10,
      difficultyLevel,
      experienceLevel,
    } = req.query;

    if (!topicName) {
      return res.status(400).json({
        success: false,
        message: "Topic name is required",
      });
    }

    // Build query
    const query = {};

    if (difficultyLevel) {
      query.difficultyLevel = difficultyLevel;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    // Get model for this topic
    const TopicModel = TopicQuestionModelFactory.getModel(topicName);

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await TopicModel.countDocuments(query);

    // Fetch questions
    const questions = await TopicModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching topic questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch topic questions",
      error: error.message,
    });
  }
};

module.exports = getTopicQuestions;
