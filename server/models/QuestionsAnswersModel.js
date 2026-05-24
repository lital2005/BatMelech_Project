const mongoose = require("mongoose");

const qaSchema = new mongoose.Schema({

  code: {
    type: Number,
    required: true,
    unique: true,
    validate: {
      validator: v => Number.isInteger(v) && v > 0,
      message: "Code must be positive integer"
    }
  },

  askerCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    validate: {
      validator: v => mongoose.Types.ObjectId.isValid(v),
      message: "Invalid asker ID"
    }
  },

  responderCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: v => !v || mongoose.Types.ObjectId.isValid(v),
      message: "Invalid responder ID"
    }
  },

  /** תלמידה בוחרת לאיזה רב/מרצה השאלה מיועדת */
  targetLecturerCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: v => !v || mongoose.Types.ObjectId.isValid(v),
      message: "Invalid target lecturer ID"
    }
  },

  question: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1000
  },

  answer: {
    type: String,
    maxlength: 2000
  },

  status: {
    type: String,
    enum: ["answered", "notAnswered"],
    default: "notAnswered"
  },

  dateTime: {
    type: Date,
    default: Date.now,
    validate: {
      validator: v => v <= new Date(),
      message: "Date cannot be in the future"
    }
  },

  /** טקסט שמוצג בעמוד שאלות ותשובות לאחר שמרצה פרסמה מתוך הצ׳אט */
  publicQaQuestionText: {
    type: String,
    maxlength: 2000,
    default: "",
  },

  publicQaAnswerText: {
    type: String,
    maxlength: 2000,
    default: "",
  },

  /** true = הוסר במכוון מעמוד שאלות ותשובות (גם אם נשארו question/answer בשיחה) */
  hiddenFromPublicQa: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

module.exports = mongoose.model("QuestionsAnswers", qaSchema);