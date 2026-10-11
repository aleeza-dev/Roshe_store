
const mongoose = require("mongoose");

const storeSettingsSchema = new mongoose.Schema(
  {
    freeShipping: {
      type: Boolean,
      default: true,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "StoreSettings",
  storeSettingsSchema
);
