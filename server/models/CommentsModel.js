const mongoose = require("mongoose");

const commentsSchema = new mongoose.Schema({

  code: {
    type: Number,
    required: true,
    unique: true
  },

  userCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  seminaryCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seminary",
    required: true
  },

  content: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 1000
  },

  /** דירוג 1–5 כוכבים */
  rating: {
    type: Number,
    min: 1,
    max: 5
  },

  date: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

module.exports = mongoose.model("Comments", commentsSchema);