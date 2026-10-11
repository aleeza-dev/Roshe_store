const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Customer",
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Direct discount for this specific product.
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 90,
      validate: {
        validator: Number.isFinite,
        message: "Discount must be a valid number.",
      },
    },

    category: {
      type: String,
      required: true,
      enum: ["Women", "Accessories"],
    },

    images: [
      {
        type: String,
        required: true,
      },
    ],

    sizes: [
      {
        type: String,
      },
    ],

    colors: [
      {
        type: String,
      },
    ],

    stock: {
      type: Number,
      default: 0,
    },

    isNew: {
      type: Boolean,
      default: false,
    },

    reviews: {
      type: [reviewSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
