const path = require("path");
const fs = require("fs").promises;
const gTTS = require("gtts");
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
  async generateSpeech(text, fileName = null, outputDir = "voice", userId = null, questionId = null) {
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
        finalFileName = fileName.endsWith('.mp3') ? fileName : `${fileName}.mp3`;
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
          const userFiles = files.filter(file =>
            file.startsWith(`user-${userId}-question-`) && file !== finalFileName
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
        }"`
      );

      // Generate speech with gTTS
      const speech = new gTTS(text, "en");

      return new Promise((resolve, reject) => {
        speech.save(filePath, async (err) => {
          if (err) {
            logger.error("Error generating speech:", err);
            reject({
              success: false,
              message: "Failed to generate speech",
              error: err,
            });
            return;
          }

          // Wait a bit to ensure file is fully written to disk
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify file exists and has content
          try {
            const stats = await fs.stat(filePath);
            if (stats.size === 0) {
              logger.error("Generated audio file is empty");
              reject({
                success: false,
                message: "Generated audio file is empty",
              });
              return;
            }
            logger.info(`✅ Speech generated successfully: ${finalFileName} (${stats.size} bytes)`);
          } catch (statError) {
            logger.error("Error verifying audio file:", statError);
            reject({
              success: false,
              message: "Failed to verify audio file",
              error: statError,
            });
            return;
          }

          const relativePath = path.relative(
            path.join(__dirname, "../.."),
            filePath
          );
          const url = `/uploads/${outputDir}/${finalFileName}`;

          resolve({
            success: true,
            filePath,
            fileName: finalFileName,
            url,
            relativePath,
          });
        });
      });
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
  async generateSpeechStream(text, fileName = null, userId = null, questionId = null) {
    const result = await this.generateSpeech(text, fileName, "voice", userId, questionId);

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
