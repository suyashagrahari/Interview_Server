const axios = require("axios");
const logger = require("../utils/logger");
require("dotenv").config();

class ChatGPTService {
  constructor() {
    this.apiKey = process.env.CHATGPT_API_KEY;
    this.baseURL = "https://api.openai.com/v1/chat/completions";
    this.model = "gpt-3.5-turbo";
  }

  /**
   * Generate interview questions based on resume and interview parameters
   * @param {Object} params - Parameters for question generation
   * @param {string} params.resumeText - The resume text content
   * @param {string} params.interviewType - Type of interview (technical/behavioral)
   * @param {string} params.level - Experience level (0-2, 3-4, etc.)
   * @param {string} params.difficultyLevel - Difficulty level (beginner/intermediate/expert)
   * @param {string} params.jobRole - Job role for the interview
   * @returns {Promise<Object>} Generated questions with answers and keywords
   */
  async generateInterviewQuestions({
    resumeText,
    interviewType,
    level,
    difficultyLevel,
    jobRole,
  }) {
    try {
      const prompt = this.buildPrompt({
        resumeText,
        interviewType,
        level,
        difficultyLevel,
        jobRole,
      });

      const response = await axios.post(
        this.baseURL,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert technical interviewer who creates comprehensive interview questions based on resumes. Always respond with valid JSON format.",
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
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("ChatGPT API response received", {
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
      const questionsData = JSON.parse(jsonContent);

      return {
        success: true,
        questions: questionsData.questions,
        totalTokensUsed: usage.total_tokens,
      };
    } catch (error) {
      logger.error("Error generating interview questions:", error);

      if (error.response) {
        logger.error("ChatGPT API Error:", {
          status: error.response.status,
          data: error.response.data,
        });
      }

      throw new Error(
        `Failed to generate interview questions: ${error.message}`
      );
    }
  }

  /**
   * Build the prompt for ChatGPT
   * @param {Object} params - Parameters for prompt building
   * @returns {string} The formatted prompt
   */
  buildPrompt({ resumeText, interviewType, level, difficultyLevel, jobRole }) {
    const difficultyDescription =
      this.getDifficultyDescription(difficultyLevel);
    const levelDescription = this.getLevelDescription(level);
    const interviewTypeDescription =
      this.getInterviewTypeDescription(interviewType);

    return `Based on the following resume and interview parameters, generate 8 high-quality interview questions.

RESUME:
${resumeText}

INTERVIEW PARAMETERS:
- Job Role: ${jobRole}
- Interview Type: ${interviewTypeDescription}
- Experience Level: ${levelDescription}
- Difficulty Level: ${difficultyDescription}

REQUIREMENTS:
1. Generate exactly 8 questions
2. Questions should be relevant to the candidate's resume and experience
3. Mix of different question types (conceptual, practical, scenario-based)
4. Questions should match the difficulty level and experience level
5. Include relevant keywords that candidates should mention in their answers
6. Provide comprehensive expected answers that show what a good candidate response looks like

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "questionId": "q1",
      "question": "What are React Hooks, and can you explain a situation where you used useEffect and useMemo in a project?",
      "category": "Technical Skills",
      "expectedAnswer": "React Hooks are functions that allow developers to use state and lifecycle features in functional components without writing a class. Two commonly used hooks are useEffect and useMemo. In one of my projects, I worked on a dashboard where real-time data was being fetched from an API every few seconds. I used useEffect to set up the data-fetching interval and clean it up when the component unmounted, ensuring no memory leaks. For performance optimization, I used useMemo to memoize expensive calculations, such as filtering large data sets, so that the function did not recompute unless the data actually changed. This significantly reduced unnecessary re-renders and improved the performance of the app. By combining these hooks, I was able to keep the code cleaner, more readable, and more efficient, which impressed both my team and the client.",
      "keywords": ["React", "Hooks", "useEffect", "useMemo", "Performance Optimization"]
    }
  ]
}


IMPORTANT:
- Make questions specific to the candidate's background
- Ensure keywords are relevant and commonly used in the field
- Expected answers should be detailed and show depth of understanding
- Categories should be relevant (e.g., "Technical Skills", "Problem Solving", "System Design", "Leadership", etc.)
- Questions should progressively increase in complexity
- Include both theoretical and practical questions

Generate the questions now:`;
  }

  /**
   * Get difficulty level description
   * @param {string} difficultyLevel - The difficulty level
   * @returns {string} Description of the difficulty level
   */
  getDifficultyDescription(difficultyLevel) {
    const descriptions = {
      beginner:
        "Beginner level - Focus on basic concepts, fundamental knowledge, and entry-level understanding",
      intermediate:
        "Intermediate level - Focus on practical application, problem-solving, and moderate complexity",
      expert:
        "Expert level - Focus on advanced concepts, system design, architecture, and leadership skills",
    };
    return descriptions[difficultyLevel] || descriptions.intermediate;
  }

  /**
   * Get experience level description
   * @param {string} level - The experience level
   * @returns {string} Description of the experience level
   */
  getLevelDescription(level) {
    const descriptions = {
      "0-2":
        "0-2 years experience - Entry level, focus on fundamentals and basic practical knowledge",
      "3-4":
        "3-4 years experience - Mid-level, focus on practical experience and problem-solving",
      "5-6":
        "5-6 years experience - Senior level, focus on advanced skills and mentoring",
      "7-8":
        "7-8 years experience - Lead level, focus on architecture and team leadership",
      "9-10":
        "9-10+ years experience - Principal/Staff level, focus on system design and strategic thinking",
    };
    return descriptions[level] || descriptions["3-4"];
  }

  /**
   * Get interview type description
   * @param {string} interviewType - The interview type
   * @returns {string} Description of the interview type
   */
  getInterviewTypeDescription(interviewType) {
    const descriptions = {
      technical:
        "Technical interview - Focus on technical skills, coding, system design, and problem-solving",
      behavioral:
        "Behavioral interview - Focus on soft skills, past experiences, leadership, and cultural fit",
    };
    return descriptions[interviewType] || descriptions.technical;
  }

  /**
   * Generate a response using ChatGPT
   * @param {string} prompt - The prompt to send to ChatGPT
   * @param {number} maxTokens - Maximum tokens for response
   * @param {number} temperature - Temperature for response generation
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(prompt, maxTokens = 2000, temperature = 0.7) {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert AI assistant. Always respond with valid JSON format when requested.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("ChatGPT response generated", {
        totalTokens: usage.total_tokens,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      });

      // Handle markdown code blocks in response
      let jsonContent = content;
      if (content.includes("```json")) {
        jsonContent = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        jsonContent = content.split("```")[1].split("```")[0].trim();
      }
      return jsonContent;
    } catch (error) {
      logger.error("Error generating ChatGPT response:", error);

      if (error.response) {
        logger.error("ChatGPT API Error:", {
          status: error.response.status,
          data: error.response.data,
        });
      }

      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Test the ChatGPT API connection
   * @returns {Promise<boolean>} Whether the API is working
   */
  async testConnection() {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: this.model,
          messages: [
            {
              role: "user",
              content: "Hello, please respond with 'API is working'",
            },
          ],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content.includes(
        "API is working"
      );
    } catch (error) {
      logger.error("ChatGPT API connection test failed:", error);
      return false;
    }
  }
}

module.exports = new ChatGPTService();
