const ttsService = require('./src/services/ttsService');
const path = require('path');
const fs = require('fs');

async function testAudioGeneration() {
  console.log('🎵 Testing TTS Audio Generation...\n');

  try {
    // Test 1: Generate audio with userId and questionId
    console.log('Test 1: Generate audio with userId and questionId');
    const result1 = await ttsService.generateSpeechStream(
      'Hello, this is your first interview question. Can you tell me about yourself?',
      null,
      'user123',
      'question456'
    );

    if (result1.success) {
      console.log('✅ Success!');
      console.log('   File:', result1.fileName);
      console.log('   URL:', result1.url);
      console.log('   Base64 length:', result1.audioBase64?.length || 0);

      // Verify file exists and has .mp3 extension
      const filePath = result1.filePath;
      const exists = fs.existsSync(filePath);
      const hasExtension = path.extname(filePath) === '.mp3';

      console.log('   File exists:', exists);
      console.log('   Has .mp3 extension:', hasExtension);

      if (exists) {
        const stats = fs.statSync(filePath);
        console.log('   File size:', stats.size, 'bytes');
      }
    } else {
      console.log('❌ Failed:', result1.message);
    }

    console.log('\n---\n');

    // Test 2: Generate another audio for same user (should cleanup previous)
    console.log('Test 2: Generate second audio for same user (should cleanup first)');
    const result2 = await ttsService.generateSpeechStream(
      'This is the second question. What are your strengths?',
      null,
      'user123',
      'question789'
    );

    if (result2.success) {
      console.log('✅ Success!');
      console.log('   File:', result2.fileName);
      console.log('   Previous file should be deleted');

      // Check if previous file is deleted
      if (result1.success) {
        const previousExists = fs.existsSync(result1.filePath);
        console.log('   Previous file deleted:', !previousExists);
      }
    } else {
      console.log('❌ Failed:', result2.message);
    }

    console.log('\n---\n');

    // Test 3: List all files in voice directory
    console.log('Test 3: List all voice files');
    const voiceDir = path.join(__dirname, 'uploads/voice');
    const files = fs.readdirSync(voiceDir);
    console.log('Files in voice directory:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(voiceDir, file));
      console.log(`   - ${file} (${stats.size} bytes)`);
    });

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAudioGeneration();
