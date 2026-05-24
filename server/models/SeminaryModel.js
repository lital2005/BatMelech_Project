const mongoose = require("mongoose");

const seminarySchema = new mongoose.Schema({

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: v => !v || mongoose.Types.ObjectId.isValid(v),
      message: "Invalid creator ID"
    }
  },

  seminaryCode: {
    type: Number,
    required: true,
    unique: true,
    validate: {
      validator: v => Number.isInteger(v) && v > 0,
      message: "Seminary code must be positive"
    }
  },

  name: {
    type: String,
    required: true,
    minlength: 2
  },

  address: {
    type: String,
    minlength: 3
  },

  city: {
    type: String,
    minlength: 2
  },

  logo: {
    type: String
  },

  phone: {
    type: String,
    validate: {
      validator: v => !v || /^[0-9]{9,10}$/.test(v),
      message: "Invalid phone number"
    }
  },

  email: {
    type: String,
    validate: {
      validator: v => !v || /^\S+@\S+\.\S+$/.test(v),
      message: "Invalid email"
    }
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  /** אישור מנהלת לפני פרסום ציבורי */
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
  },

  about: {
    type: String,
    maxlength: 1000
  },

  galleryImages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ImageGallery"
  }],

  materials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Materials"
  }]

}, { timestamps: true });

module.exports = mongoose.model("Seminary", seminarySchema);