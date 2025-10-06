const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs").promises;
const gTTS = require("gtts");

// Create audio and voice directories if they don't exist
const audioDir = path.join(__dirname, "uploads/audio");
const voiceDir = path.join(__dirname, "uploads/voice");

(async () => {
  try {
    await fs.mkdir(audioDir, { recursive: true });
    await fs.mkdir(voiceDir, { recursive: true });
    console.log("Directories created/verified successfully");
  } catch (err) {
    console.error("Error creating directories:", err);
  }
})();

/**
 * Generate speech from text and save to file
 * @param {string} text - The text to convert to speech
 * @param {string} fileName - Optional custom filename (without extension)
 * @param {string} outputDir - Directory to save the file ('audio' or 'voice')
 * @returns {Promise<Object|null>} Object with filePath and fileName, or null if error
 */
async function generateSpeech(text, fileName = null, outputDir = "voice") {
  if (!text.trim()) {
    console.error("Error: Text cannot be empty");
    return null;
  }

  // Generate filename if not provided
  const finalFileName = fileName || `speech-${uuidv4().substring(0, 8)}.mp3`;
  const targetDir = outputDir === "voice" ? voiceDir : audioDir;
  const filePath = path.join(targetDir, finalFileName);

  try {
    // Check if the previous file exists and delete it
    await fs
      .access(filePath)
      .then(() => fs.unlink(filePath))
      .catch(() => {});

    console.log(
      `Generating speech for: "${text.substring(0, 50)}${
        text.length > 50 ? "..." : ""
      }"`
    );
    console.log(`Output file: ${filePath}`);

    // Generate speech with the given text
    const speech = new gTTS(text, "en");

    return new Promise((resolve, reject) => {
      speech.save(filePath, (err) => {
        if (err) {
          console.error("Error generating speech:", err);
          reject(err);
          return;
        }
        console.log(`✅ Speech generated successfully: ${finalFileName}`);
        resolve({ filePath, fileName: finalFileName });
      });
    });
  } catch (error) {
    console.error("Error handling speech generation:", error);
    return null;
  }
}

/**
 * Interactive function to generate speech from command line input
 */
async function interactiveSpeechGeneration() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("\n🎤 Text-to-Speech Generator");
  console.log("=============================");

  try {
    while (true) {
      const text = await question(
        "\nEnter text to convert to speech (or 'quit' to exit): "
      );

      if (text.toLowerCase() === "quit" || text.toLowerCase() === "exit") {
        console.log("Goodbye! 👋");
        break;
      }

      if (!text.trim()) {
        console.log("❌ Please enter some text.");
        continue;
      }

      const useCustomName = await question(
        "Use custom filename? (y/n, default: n): "
      );
      let fileName = null;

      if (
        useCustomName.toLowerCase() === "y" ||
        useCustomName.toLowerCase() === "yes"
      ) {
        const customName = await question(
          "Enter filename (without extension): "
        );
        fileName = customName ? `${customName}.mp3` : null;
      }

      const outputDir = await question(
        "Output directory (audio/voice, default: voice): "
      );
      const finalOutputDir = outputDir.trim() === "audio" ? "audio" : "voice";

      await generateSpeech(text, fileName, finalOutputDir);
    }
  } catch (error) {
    console.error("Error in interactive mode:", error);
  } finally {
    rl.close();
  }
}

// Export functions for use in other modules
module.exports = {
  generateSpeech,
  interactiveSpeechGeneration,
};

// If this script is run directly, start interactive mode
if (require.main === module) {
  interactiveSpeechGeneration().catch(console.error);
}

