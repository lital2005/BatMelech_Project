const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionsAnswers",
      required: true,
      index: true,
    },
    senderCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
      trim: true,
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
