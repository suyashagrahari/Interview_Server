const CompanyQuestionModelFactory = require("../../models/CompanyQuestion");
const logger = require("../../utils/logger");

/**
 * @desc    Get questions for a specific company
 * @route   GET /api/company-questions/:companyName
 * @access  Public
 */
const getCompanyQuestions = async (req, res) => {
  try {
    const { companyName } = req.params;
    const {
      page = 1,
      limit = 10,
      difficultyLevel,
      experienceLevel,
      questionType,
      jobRole,
    } = req.query;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
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

    if (questionType) {
      query.questionType = questionType;
    }

    if (jobRole) {
      query.jobRole = jobRole;
    }

    // Get model for this company
    const CompanyModel = CompanyQuestionModelFactory.getModel(companyName);

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CompanyModel.countDocuments(query);

    // Fetch questions
    const questions = await CompanyModel.find(query)
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
    logger.error("Error fetching company questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company questions",
      error: error.message,
    });
  }
};

module.exports = getCompanyQuestions;
