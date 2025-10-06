const fs = require('fs');
const path = require('path');

const voiceDir = path.join(__dirname, 'uploads/voice');
const audioDir = path.join(__dirname, 'uploads/audio');

async function cleanupAudioFiles(hoursOld = 24) {
  console.log(`🧹 Cleaning up audio files older than ${hoursOld} hours...\n`);

  const directories = [
    { name: 'voice', path: voiceDir },
    { name: 'audio', path: audioDir }
  ];

  let totalDeleted = 0;
  const maxAge = hoursOld * 60 * 60 * 1000;
  const now = Date.now();

  for (const dir of directories) {
    console.log(`Checking ${dir.name} directory: ${dir.path}`);

    if (!fs.existsSync(dir.path)) {
      console.log(`  ⚠️  Directory doesn't exist\n`);
      continue;
    }

    const files = fs.readdirSync(dir.path);

    if (files.length === 0) {
      console.log(`  ✅ Directory is empty\n`);
      continue;
    }

    console.log(`  Found ${files.length} file(s)`);

    for (const file of files) {
      const filePath = path.join(dir.path, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      const ageHours = (age / (1000 * 60 * 60)).toFixed(2);

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`  🗑️  Deleted: ${file} (${ageHours} hours old)`);
        totalDeleted++;
      } else {
        console.log(`  ✓  Kept: ${file} (${ageHours} hours old)`);
      }
    }

    console.log();
  }

  console.log(`✅ Cleanup complete! Deleted ${totalDeleted} file(s)\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const hoursOld = args[0] ? parseInt(args[0]) : 24;

cleanupAudioFiles(hoursOld).catch(console.error);
