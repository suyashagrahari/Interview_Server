const mongoose = require("mongoose");
const Interview = require("./src/models/Interview");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/interview_practice", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupInterviews() {
  try {
    console.log("Connecting to database...");

    // Find all active interviews
    const activeInterviews = await Interview.find({
      status: { $in: ["scheduled", "in_progress"] },
      isActive: true,
    });

    console.log(`Found ${activeInterviews.length} active interviews:`);
    activeInterviews.forEach((interview) => {
      console.log(
        `- ID: ${interview._id}, Status: ${interview.status}, Created: ${interview.createdAt}`
      );
    });

    if (activeInterviews.length > 0) {
      // Update all active interviews to completed status
      const result = await Interview.updateMany(
        {
          status: { $in: ["scheduled", "in_progress"] },
          isActive: true,
        },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
        }
      );

      console.log(
        `Updated ${result.modifiedCount} interviews to completed status`
      );
    } else {
      console.log("No active interviews found");
    }

    console.log("Cleanup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupInterviews();
