
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 30,
    },

    percentOff: {
      type: Number,
      required: true,
      min: 1,
      max: 90,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Coupon", couponSchema);
