const { axios, logger, config } = require("./dependencies");

/**
 * Generate interview questions based on job description and interview parameters
 * @param {Object} params - Parameters for question generation
 * @param {string} params.jdText - The job description text content
 * @param {string} params.interviewType - Type of interview (technical/behavioral)
 * @param {string} params.level - Experience level (0-2, 3-4, etc.)
 * @param {string} params.difficultyLevel - Difficulty level (beginner/intermediate/expert)
 * @param {string} params.jobRole - Job role for the interview
 * @returns {Promise<Object>} Generated questions with answers and keywords
 */
const generateInterviewQuestionsFromJD = async ({
  jdText,
  interviewType,
  level,
  difficultyLevel,
  jobRole,
}) => {
  try {
    // Build prompt for job description based questions
    const prompt = `You are an expert interviewer creating ${interviewType} interview questions for a ${jobRole} position.

Job Description:
${jdText}

Interview Parameters:
- Interview Type: ${interviewType}
- Experience Level: ${level} years
- Difficulty: ${difficultyLevel}
- Job Role: ${jobRole}

Generate exactly 8 comprehensive interview questions that assess the candidate's fit for this specific role based on the job description requirements.

Requirements:
1. Questions must be directly relevant to the skills, technologies, and requirements mentioned in the job description
2. Mix of ${interviewType} questions appropriate for the ${difficultyLevel} level
3. Include questions about specific technologies, tools, or methodologies mentioned in the JD
4. Each question should have an expected answer that demonstrates understanding of the JD requirements
5. Include 3-5 relevant keywords for each question

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "questionId": "unique_id_here",
      "question": "The actual question text",
      "category": "Relevant category (e.g., Technical Skills, System Design, Problem Solving)",
      "expectedAnswer": "A detailed expected answer showing what a good response would include",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}

Make sure to return ONLY valid JSON, no markdown formatting or code blocks.`;

    const response = await axios.post(
      config.baseURL,
      {
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical interviewer who creates comprehensive interview questions based on job descriptions. Always respond with valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const usage = response.data.usage;

    logger.info("ChatGPT API response received for JD questions", {
      totalTokens: usage.total_tokens,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    });

    // Parse the JSON response (handle markdown code blocks)
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonContent = content.split("```")[1].split("```")[0].trim();
    }

    console.log("🔍 DEBUG: ChatGPT raw response content:", content);
    console.log("🔍 DEBUG: ChatGPT parsed jsonContent:", jsonContent);

    const questionsData = JSON.parse(jsonContent);

    console.log(
      "🔍 DEBUG: Parsed questions count:",
      questionsData.questions ? questionsData.questions.length : 0
    );
    console.log(
      "🔍 DEBUG: First question data:",
      questionsData.questions && questionsData.questions[0]
        ? questionsData.questions[0]
        : "UNDEFINED"
    );
    console.log(
      "🔍 DEBUG: Full questions data:",
      JSON.stringify(questionsData, null, 2)
    );

    return {
      success: true,
      questions: questionsData.questions,
      totalTokensUsed: usage.total_tokens,
    };
  } catch (error) {
    logger.error("Error generating interview questions from JD:", error);

    if (error.response) {
      logger.error("ChatGPT API Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    throw new Error(
      `Failed to generate interview questions from JD: ${error.message}`
    );
  }
};

module.exports = generateInterviewQuestionsFromJD;
