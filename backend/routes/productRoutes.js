
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const protectAdmin = require("../middleware/authMiddleware");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

// Submit a customer review
router.post("/:id/reviews", async (req, res) => {
  try {
    const { name, rating, comment } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const numericRating = Number(rating);
    const reviewComment =
      typeof comment === "string" ? comment.trim() : "";

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5 stars",
      });
    }

    if (!reviewComment || reviewComment.length > 1000) {
      return res.status(400).json({
        message: "Please enter a review of up to 1000 characters",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    product.reviews.push({
      name:
        typeof name === "string" && name.trim()
          ? name.trim().slice(0, 60)
          : "Customer",
      rating: numericRating,
      comment: reviewComment,
    });

    await product.save();

    res.status(201).json({
      message: "Review submitted successfully",
      reviews: product.reviews,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit review",
      error: error.message,
    });
  }
});

// Get a single product
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
});

// Add a new product - Admin only
router.post("/", protectAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({
      message: "Failed to add product",
      error: error.message,
    });
  }
});

// Update product - Admin only
router.put("/:id", protectAdmin, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(400).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
});

// Delete product - Admin only
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
});

module.exports = router;
