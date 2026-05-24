const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["seminary_approved", "seminary_rejected"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    seminaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seminary",
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
