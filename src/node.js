const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// Directory path for audio files
const audioDir = path.join(__dirname, "../uploads/audio");

/**
 * Generate audio from text using Kokoro API and save to uploads/audio folder
 * @param {string} text - The text to convert to speech
 * @param {string} fileName - Optional filename (without extension)
 * @returns {Promise<Object>} Object with success status, filePath, and fileName
 */
async function generateAudioFromKokoro(text, fileName = null) {
  try {
    // Ensure audio directory exists
    await fs.mkdir(audioDir, { recursive: true });

    // Generate filename if not provided
    const timestamp = Date.now();
    const finalFileName = fileName
      ? `${fileName}.mp3`
      : `audio-${timestamp}.mp3`;
    const filePath = path.join(audioDir, finalFileName);

    console.log(`🎤 Generating audio for text: "${text.substring(0, 50)}..."`);
    console.log(`📁 Saving to: ${filePath}`);

    // Make request to Kokoro API
    const response = await axios.post(
      "http://localhost:8880/v1/audio/speech",
      {
        model: "kokoro",
        input: text,
        voice: "af_sky",
        response_format: "mp3",
        speed: 1.0,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer", // Important: receive binary data
        timeout: 300000, // 5 minutes timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    // Save the audio buffer to file
    await fs.writeFile(filePath, Buffer.from(response.data));

    // Verify file exists and has content
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error("Generated audio file is empty");
    }

    console.log(
      `✅ Audio generated successfully: ${finalFileName} (${stats.size} bytes)`
    );
    console.log(`📂 File saved at: ${filePath}`);

    return {
      success: true,
      filePath,
      fileName: finalFileName,
      fileSize: stats.size,
      url: `/uploads/audio/${finalFileName}`,
    };
  } catch (error) {
    console.error("❌ Error generating audio:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.error(
        "⚠️ Cannot connect to Kokoro API. Please ensure the server is running on http://localhost:8880"
      );
    } else if (error.response) {
      console.error(
        `⚠️ API returned status ${error.response.status}:`,
        error.response.data
      );
    } else if (error.request) {
      console.error("⚠️ No response received from Kokoro API");
    }

    return {
      success: false,
      message: error.message,
      error: error.code || "UNKNOWN_ERROR",
    };
  }
}

// Example usage
if (require.main === module) {
  const testText =
    "Hello Ratnesh Agrahari! I'm Lisa Wang, a Senior Engineer with 9 years of experience in Java development and microservices architecture. I see from your resume that you are a highly motivated MERN developer with a strong foundation in web development and UI/UX design. Your experience at Health Umbrella Foundation in Jaipur, developing and maintaining full-stack web applications using the MERN stack, is impressive. I'm particularly interested in how you utilized Redux and Redux Toolkit for efficient state management. It's great to see your commitment to delivering exceptional web applications and user experiences. Can you please introduce yourself and highlight some key projects you've worked on?";

  generateAudioFromKokoro(testText, "test-audio")
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Success!");
        console.log(`File: ${result.fileName}`);
        console.log(`Size: ${result.fileSize} bytes`);
        console.log(`Path: ${result.filePath}`);
      } else {
        console.log("\n❌ Failed:", result.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

// Export the function for use in other modules
module.exports = { generateAudioFromKokoro };
