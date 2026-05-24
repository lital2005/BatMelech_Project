const mongoose = require("mongoose");

const seminaryJoinRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seminaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seminary",
      required: true,
    },
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "initial_approved", "rejected"],
      default: "pending",
      required: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    initialApprovedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

seminaryJoinRequestSchema.index({ studentId: 1, seminaryId: 1 }, { unique: true });

module.exports = mongoose.model("SeminaryJoinRequest", seminaryJoinRequestSchema);
