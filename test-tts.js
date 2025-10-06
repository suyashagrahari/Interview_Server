// Simple test script to verify TTS functionality
const ttsService = require('./src/services/ttsService');

async function testTTS() {
  console.log('🧪 Testing TTS Service...\n');

  const testText = "Hello, this is a test of the text to speech system.";

  console.log(`📝 Converting text to speech: "${testText}"\n`);

  try {
    const result = await ttsService.generateSpeechStream(testText, 'test-audio');

    if (result.success) {
      console.log('✅ TTS Generation Successful!');
      console.log('📊 Results:');
      console.log(`   - File: ${result.fileName}`);
      console.log(`   - URL: ${result.url}`);
      console.log(`   - Base64 Length: ${result.audioBase64.length} characters`);
      console.log(`   - Base64 Preview: ${result.audioBase64.substring(0, 50)}...`);
      console.log('\n🎵 Audio file saved to:', result.filePath);
      console.log('\n✅ Test completed successfully!');
    } else {
      console.error('❌ TTS Generation Failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testTTS();
