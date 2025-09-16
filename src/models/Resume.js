const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    resumeName: {
      type: String,
      required: [true, "Resume name is required"],
      trim: true,
      maxlength: [100, "Resume name cannot be more than 100 characters"],
    },
    resumeText: {
      type: String,
      required: [true, "Resume text is required"],
      maxlength: [50000, "Resume text cannot be more than 50000 characters"],
    },
    originalFileName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size cannot be negative"],
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: ["pdf", "doc", "docx"],
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
resumeSchema.index({ userId: 1, resumeName: 1 }, { unique: true });
resumeSchema.index({ userId: 1, isActive: 1 });
resumeSchema.index({ uploadDate: -1 });

// Virtual for user's full name (populated from User model)
resumeSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Static method to find resumes by user
resumeSchema.statics.findByUserId = function (userId, includeInactive = false) {
  const query = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ uploadDate: -1 });
};

// Static method to find resume by user and name
resumeSchema.statics.findByUserAndName = function (userId, resumeName) {
  return this.findOne({ userId, resumeName, isActive: true });
};

// Instance method to soft delete resume
resumeSchema.methods.softDelete = function () {
  this.isActive = false;
  return this.save();
};

// Pre-save middleware to validate file type
resumeSchema.pre("save", function (next) {
  // Validate file type
  const allowedTypes = ["pdf", "doc", "docx"];
  if (!allowedTypes.includes(this.fileType)) {
    return next(
      new Error("Invalid file type. Only PDF, DOC, and DOCX files are allowed.")
    );
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (this.fileSize > maxSize) {
    return next(new Error("File size exceeds maximum limit of 5MB."));
  }

  next();
});

// Ensure unique resume name per user
resumeSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(new Error("A resume with this name already exists for this user."));
  } else {
    next(error);
  }
});

module.exports = mongoose.model("Resume", resumeSchema);
