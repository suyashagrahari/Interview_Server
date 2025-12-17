const mongoose = require("mongoose");

const jobDescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    jdName: {
      type: String,
      required: [true, "Job description name is required"],
      trim: true,
      maxlength: [100, "JD name cannot be more than 100 characters"],
    },
    jdText: {
      type: String,
      required: [true, "Job description text is required"],
      maxlength: [50000, "JD text cannot be more than 50000 characters"],
    },
    originalFileName: {
      type: String,
      trim: true,
      default: null,
    },
    fileSize: {
      type: Number,
      min: [0, "File size cannot be negative"],
      default: 0,
    },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "docx", "txt", "text", "pasted"],
      default: "pasted",
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Additional metadata
    parsedSuccessfully: {
      type: Boolean,
      default: true,
    },
    parsingErrors: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
jobDescriptionSchema.index({ userId: 1, jdName: 1 }, { unique: true });
jobDescriptionSchema.index({ userId: 1, isActive: 1 });
jobDescriptionSchema.index({ uploadDate: -1 });

// Virtual for user's full name (populated from User model)
jobDescriptionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Static method to find JDs by user
jobDescriptionSchema.statics.findByUserId = function (
  userId,
  includeInactive = false
) {
  const query = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ uploadDate: -1 });
};

// Static method to find JD by user and name
jobDescriptionSchema.statics.findByUserAndName = function (userId, jdName) {
  return this.findOne({ userId, jdName, isActive: true });
};

// Instance method to soft delete JD
jobDescriptionSchema.methods.softDelete = function () {
  this.isActive = false;
  return this.save();
};

// Pre-save middleware to validate file type
jobDescriptionSchema.pre("save", function (next) {
  // Validate file type if file was uploaded
  if (this.fileType && this.fileType !== "pasted" && this.fileType !== "text") {
    const allowedTypes = ["pdf", "doc", "docx", "txt"];
    if (!allowedTypes.includes(this.fileType)) {
      return next(
        new Error(
          "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed."
        )
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (this.fileSize > maxSize) {
      return next(new Error("File size exceeds maximum limit of 5MB."));
    }
  }

  next();
});

// Ensure unique JD name per user
jobDescriptionSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(
      new Error("A job description with this name already exists for this user.")
    );
  } else {
    next(error);
  }
});

module.exports = mongoose.model("JobDescription", jobDescriptionSchema);
