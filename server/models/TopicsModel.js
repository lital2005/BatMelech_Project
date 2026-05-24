const mongoose = require("mongoose");

const topicsSchema = new mongoose.Schema({

  topicCode: {
    type: Number,
    required: true,
    unique: true,
    validate: {
      validator: v => Number.isInteger(v) && v > 0,
      message: "Topic code must be positive integer"
    }
  },

  topicName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100
  },

  image: {
    type: String,
    validate: {
      validator: v => !v || v.startsWith("http"),
      message: "Image must be valid URL"
    }
  }

}, { timestamps: true });

module.exports = mongoose.model("Topics", topicsSchema);