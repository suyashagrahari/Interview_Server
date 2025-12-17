const mongoose = require("mongoose");

const topicTitleSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Title text is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
topicTitleSchema.index({ text: 1 });
topicTitleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("TopicTitle", topicTitleSchema);
