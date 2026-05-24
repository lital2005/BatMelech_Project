const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({

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

  seminaryCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seminary",
    required: true
  },

  image: {
    type: String,
    required: true
  },

  description: {
    type: String,
    maxlength: 500
  },

  date: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

module.exports = mongoose.model("ImageGallery", gallerySchema);