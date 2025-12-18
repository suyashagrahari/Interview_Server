const path = require("path");
const fs = require("fs").promises;
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../utils/logger");

// Directory paths - Use absolute path from project root
const projectRoot = path.join(__dirname, "../..");
const voiceDir = path.join(projectRoot, "../uploads/voice");
const audioDir = path.join(projectRoot, "../uploads/audio");

/**
 * Text-to-Speech Service
 * Converts text to speech and saves audio files
 */
class TTSService {
  constructor() {
    this.initializeDirectories();
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(voiceDir, { recursive: true });
      await fs.mkdir(audioDir, { recursive: true });
      logger.info("TTS directories initialized successfully");
    } catch (err) {
      logger.error("Error creating TTS directories:", err);
    }
  }

  /**
   * Generate speech from text and save to file
   * @param {string} text - The text to convert to speech
   * @param {string} fileName - Optional custom filename (without extension)
   * @param {string} outputDir - Directory to save the file ('audio' or 'voice')
   * @param {string} userId - User ID for cleanup tracking
   * @param {string} questionId - Question ID for cleanup tracking
   * @returns {Promise<Object|null>} Object with filePath, fileName, and url
   */
  async generateSpeech(
    text,
    fileName = null,
    outputDir = "voice",
    userId = null,
    questionId = null
  ) {
    if (!text || !text.trim()) {
      logger.error("TTS Error: Text cannot be empty");
      return { success: false, message: "Text cannot be empty" };
    }

    try {
      // Generate filename with userId and questionId if provided
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);

      let finalFileName;
      if (fileName) {
        // Ensure fileName has .mp3 extension
        finalFileName = fileName.endsWith(".mp3")
          ? fileName
          : `${fileName}.mp3`;
      } else if (userId && questionId) {
        finalFileName = `user-${userId}-question-${questionId}-${timestamp}.mp3`;
      } else {
        finalFileName = `speech-${timestamp}-${uniqueId}.mp3`;
      }

      const targetDir = outputDir === "voice" ? voiceDir : audioDir;
      const filePath = path.join(targetDir, finalFileName);

      // Clean up previous audio files for this user if userId is provided
      if (userId) {
        try {
          const files = await fs.readdir(targetDir);
          const userFiles = files.filter(
            (file) =>
              file.startsWith(`user-${userId}-question-`) &&
              file !== finalFileName
          );

          for (const file of userFiles) {
            const oldFilePath = path.join(targetDir, file);
            await fs.unlink(oldFilePath);
            logger.info(`Deleted previous audio file: ${file}`);
          }
        } catch (err) {
          logger.warn(`Could not clean up old files: ${err.message}`);
        }
      }

      // Check if file exists and delete it
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        logger.info(`Deleted existing file: ${finalFileName}`);
      } catch (err) {
        // File doesn't exist, continue
      }

      logger.info(
        `Generating speech for: "${text.substring(0, 50)}${
          text.length > 50 ? "..." : ""
        }" (${text.length} characters)`
      );

      // Calculate dynamic timeout based on text length
      // Use a very high timeout to avoid premature timeouts (5 minutes max)
      // Base timeout: 2 minutes, add 2 seconds per 50 characters
      const baseTimeout = 120000; // 2 minutes
      const additionalTimeout = Math.ceil(text.length / 50) * 2000; // 2 seconds per 50 chars
      const timeout = Math.min(baseTimeout + additionalTimeout, 300000); // Max 5 minutes

      logger.info(
        `Using timeout: ${timeout}ms (${timeout / 1000}s) for ${
          text.length
        } characters`
      );

      // Generate speech using Kokoro API with retry logic
      const maxRetries = 5; // Increased retries
      const retryDelay = 5000; // 5 seconds between retries (increased for server startup time)
      let lastError = null;

      // Helper to check if server is reachable (simple connection test)
      const isServerReachable = async () => {
        try {
          const testClient = axios.create({ timeout: 3000 });
          // Try to connect - even if endpoint doesn't exist, connection should work
          await testClient.get("http://localhost:8880", {
            validateStatus: () => true, // Accept any status
          });
          return true;
        } catch (error) {
          // ECONNREFUSED means server is not running
          if (error.code === "ECONNREFUSED") {
            return false;
          }
          // Other errors might mean server is running but endpoint doesn't exist (which is OK)
          return true;
        }
      };

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        try {
          if (attempt > 1) {
            logger.info(
              `🔄 Retry attempt ${attempt}/${maxRetries} for Kokoro API`
            );
            // Check if server is reachable before retrying
            logger.info("🔍 Checking if Kokoro API server is reachable...");
            const reachable = await isServerReachable();
            if (!reachable) {
              logger.warn(
                `⚠️ Server not reachable, waiting ${retryDelay}ms before retry...`
              );
            } else {
              logger.info("✅ Server is reachable, proceeding with request...");
            }
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }

          logger.info(
            `🚀 Making request to Kokoro API (attempt ${attempt}/${maxRetries}) at ${new Date().toISOString()}`
          );
          logger.info(
            `📋 Request config: timeout=${timeout}ms, textLength=${text.length}`
          );

          // Create a fresh axios instance to avoid any global defaults
          const axiosInstance = axios.create();

          // Use axios instance with explicit timeout in request config
          const response = await axiosInstance.post(
            "http://localhost:8880/v1/audio/speech",
            {
              model: "kokoro",
              input: text,
              voice: "af_sky",
              response_format: "mp3",
              speed: 1.0,
            },
            {
              timeout: timeout, // Very high timeout to avoid premature cancellation
              responseType: "arraybuffer", // Important: receive binary data
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              headers: {
                "Content-Type": "application/json",
              },
              validateStatus: (status) => {
                return status >= 200 && status < 300;
              },
            }
          );

          const elapsedTime = Date.now() - startTime;
          logger.info(
            `✅ API response received in ${elapsedTime}ms (${
              elapsedTime / 1000
            }s)`
          );

          // Save the audio buffer to file
          await fs.writeFile(filePath, Buffer.from(response.data));

          // Verify file exists and has content
          const stats = await fs.stat(filePath);
          if (stats.size === 0) {
            logger.error("Generated audio file is empty");
            return {
              success: false,
              message: "Generated audio file is empty",
            };
          }

          logger.info(
            `✅ Speech generated successfully: ${finalFileName} (${stats.size} bytes)`
          );

          const relativePath = path.relative(
            path.join(__dirname, "../.."),
            filePath
          );
          const url = `/uploads/${outputDir}/${finalFileName}`;

          return {
            success: true,
            filePath,
            fileName: finalFileName,
            url,
            relativePath,
          };
        } catch (apiError) {
          const elapsedTime = Date.now() - startTime;
          lastError = apiError;

          // Check if this is a retryable error (connection errors)
          const isRetryable =
            apiError.code === "ECONNREFUSED" ||
            apiError.code === "ENOTFOUND" ||
            apiError.code === "ETIMEDOUT" ||
            (apiError.request && !apiError.response);

          if (isRetryable && attempt < maxRetries) {
            logger.warn(
              `⚠️ Connection error on attempt ${attempt}/${maxRetries}: ${
                apiError.code || apiError.message
              }. Retrying in ${retryDelay}ms...`
            );
            continue; // Retry
          }

          // If not retryable or last attempt, handle the error
          logger.error("Error calling Kokoro API:", {
            message: apiError.message,
            code: apiError.code,
            textLength: text.length,
            attempt: `${attempt}/${maxRetries}`,
            elapsedTime: `${elapsedTime}ms (${elapsedTime / 1000}s)`,
            timeout: `${timeout}ms (${timeout / 1000}s)`,
            isTimeout: elapsedTime >= timeout - 1000,
          });
          let errorMessage = "Failed to generate speech from API";

          // Check for timeout or abort errors
          if (
            apiError.code === "ECONNABORTED" ||
            apiError.message?.includes("timeout") ||
            apiError.message?.includes("aborted") ||
            elapsedTime >= timeout - 1000
          ) {
            errorMessage = `Request timeout: The API took ${
              elapsedTime / 1000
            }s to respond (timeout: ${timeout / 1000}s, text length: ${
              text.length
            } characters). The API server may be slow or overloaded.`;
            logger.warn(
              `⚠️ TTS generation timeout after ${elapsedTime}ms (configured timeout: ${timeout}ms) for ${text.length} characters`
            );
          } else if (
            apiError.code === "ECONNREFUSED" ||
            apiError.code === "ENOTFOUND"
          ) {
            errorMessage = `Cannot connect to Kokoro API after ${maxRetries} attempts. Please ensure the API server is running on http://localhost:8880`;
            logger.error(`❌ Kokoro API connection error: ${apiError.code}`);
          } else if (apiError.response) {
            errorMessage =
              apiError.response.data?.error?.message ||
              apiError.response.data?.message ||
              `API returned status ${apiError.response.status}`;
          } else if (apiError.request) {
            errorMessage = `No response received from Kokoro API after ${
              elapsedTime / 1000
            }s. The server may be overloaded, unreachable, or processing slowly.`;
            logger.error(
              `❌ No response from Kokoro API after ${elapsedTime}ms (timeout: ${timeout}ms)`
            );
          } else {
            errorMessage = apiError.message || errorMessage;
          }

          // If this was the last attempt, return error
          if (attempt === maxRetries) {
            return {
              success: false,
              message: errorMessage,
              error: apiError.message,
              code: apiError.code,
            };
          }
        }
      }

      // If we get here, all retries failed
      return {
        success: false,
        message: lastError
          ? `Failed to generate speech after ${maxRetries} attempts: ${lastError.message}`
          : "Failed to generate speech from API",
        error: lastError?.message,
        code: lastError?.code,
      };
    } catch (error) {
      logger.error("Error handling speech generation:", error);
      return {
        success: false,
        message: "Internal error generating speech",
        error,
      };
    }
  }

  /**
   * Generate speech and return file stream for chunked transmission
   * @param {string} text - The text to convert to speech
   * @param {string} fileName - Optional custom filename
   * @param {string} userId - User ID for cleanup tracking
   * @param {string} questionId - Question ID for cleanup tracking
   * @returns {Promise<Object>} Object with success, filePath, fileName, and stream
   */
  async generateSpeechStream(
    text,
    fileName = null,
    userId = null,
    questionId = null
  ) {
    const result = await this.generateSpeech(
      text,
      fileName,
      "voice",
      userId,
      questionId
    );

    if (!result.success) {
      return result;
    }

    try {
      // Create read stream for chunked transmission
      const readStream = await fs.readFile(result.filePath);

      return {
        success: true,
        filePath: result.filePath,
        fileName: result.fileName,
        url: result.url,
        audioBuffer: readStream,
        audioBase64: readStream.toString("base64"),
      };
    } catch (error) {
      logger.error("Error creating audio stream:", error);
      return {
        success: false,
        message: "Failed to create audio stream",
        error,
      };
    }
  }

  /**
   * Delete audio file
   * @param {string} filePath - Path to the file to delete
   */
  async deleteAudioFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info(`Audio file deleted: ${filePath}`);
      return { success: true };
    } catch (error) {
      logger.error("Error deleting audio file:", error);
      return { success: false, error };
    }
  }

  /**
   * Get audio file as base64 for transmission
   * @param {string} filePath - Path to the audio file
   * @returns {Promise<Object>} Object with success and base64 audio
   */
  async getAudioBase64(filePath) {
    try {
      const audioBuffer = await fs.readFile(filePath);
      const base64Audio = audioBuffer.toString("base64");

      return {
        success: true,
        base64Audio,
        mimeType: "audio/mpeg",
      };
    } catch (error) {
      logger.error("Error reading audio file:", error);
      return { success: false, error };
    }
  }

  /**
   * Clean up old audio files (older than specified hours)
   * @param {number} hoursOld - Delete files older than this many hours
   * @param {string} directory - Directory to clean ('voice' or 'audio')
   */
  async cleanupOldFiles(hoursOld = 24, directory = "voice") {
    try {
      const targetDir = directory === "voice" ? voiceDir : audioDir;
      const files = await fs.readdir(targetDir);
      const now = Date.now();
      const maxAge = hoursOld * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(targetDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(
        `Cleaned up ${deletedCount} old audio files from ${directory} directory`
      );
      return { success: true, deletedCount };
    } catch (error) {
      logger.error("Error cleaning up old audio files:", error);
      return { success: false, error };
    }
  }
}

// Export singleton instance
module.exports = new TTSService();
