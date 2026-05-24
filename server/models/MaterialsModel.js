const mongoose = require("mongoose");

const materialsSchema = new mongoose.Schema({

  code: {
    type: Number,
    required: true,
    unique: true,
    validate: {
      validator: v => Number.isInteger(v) && v > 0,
      message: "Code must be positive integer"
    }
  },

  rabbiUserCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    validate: {
      validator: v => mongoose.Types.ObjectId.isValid(v),
      message: "Invalid Rabbi User ID"
    }
  },

  topicCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topics",
    required: true,
    validate: {
      validator: v => mongoose.Types.ObjectId.isValid(v),
      message: "Invalid Topic ID"
    }
  },

  date: {
    type: Date,
    default: Date.now,
    validate: {
      validator: v => v <= new Date(),
      message: "Date cannot be in the future"
    }
  },

  content: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 5000
  },

  attachments: {
    type: [String]
  },

  attachmentMeta: [{
    url: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number }
  }],

  rating: {
    type: Number,
    min: 0,
    max: 5
  }

}, { timestamps: true });

const Materials = mongoose.model("Materials", materialsSchema);
module.exports = Materials;