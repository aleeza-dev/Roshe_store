
const express = require("express");
const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const protectAdmin = require("../middleware/authMiddleware");

const router = express.Router();

const cleanCouponData = (body) => ({
  code: String(body.code || "").trim().toUpperCase(),
  percentOff: Number(body.percentOff),
  minOrderAmount: Number(body.minOrderAmount ?? 0),
  expiresAt: body.expiresAt,
  description: String(body.description || "").trim(),
  active: body.active === undefined ? true : body.active === true,
});

const validateCouponData = (data) => {
  if (!/^[A-Z0-9_-]{3,30}$/.test(data.code)) {
    return "Coupon code must be 3–30 characters using letters, numbers, _ or -.";
  }

  if (
    !Number.isFinite(data.percentOff) ||
    data.percentOff < 1 ||
    data.percentOff > 90
  ) {
    return "Discount must be between 1% and 90%.";
  }

  if (
    !Number.isFinite(data.minOrderAmount) ||
    data.minOrderAmount < 0
  ) {
    return "Minimum order amount must be zero or greater.";
  }

  const expiry = new Date(data.expiresAt);

  if (!data.expiresAt || Number.isNaN(expiry.getTime())) {
    return "Please provide a valid expiry date.";
  }

  if (typeof data.active !== "boolean") {
    return "Active status must be true or false.";
  }

  return null;
};

// Public: active, unexpired offers for the storefront ticker
router.get("/active", async (req, res) => {
  try {
    const coupons = await Coupon.find({
      active: true,
      expiresAt: { $gt: new Date() },
    })
      .select("code percentOff minOrderAmount expiresAt description")
      .sort({ percentOff: -1 });

    res.json(coupons);
  } catch (error) {
    console.error("Active coupons error:", error);
    res.status(500).json({ message: "Unable to load current offers." });
  }
});

// Public: validate a coupon for checkout preview.
// The final order must validate it again on the server.
router.post("/validate", async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const subtotal = Number(req.body.subtotal);

    if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
      return res.status(400).json({
        message: "Enter a valid coupon code and order subtotal.",
      });
    }

    const coupon = await Coupon.findOne({
      code,
      active: true,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon) {
      return res.status(404).json({
        message: "This coupon is invalid, inactive, or expired.",
      });
    }

    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order for this coupon is PKR ${coupon.minOrderAmount.toLocaleString()}.`,
      });
    }

    const discountAmount = Math.round(
      (subtotal * coupon.percentOff) / 100
    );

    res.json({
      message: "Coupon applied successfully.",
      code: coupon.code,
      percentOff: coupon.percentOff,
      discountAmount,
      subtotal,
      discountedSubtotal: Math.max(0, subtotal - discountAmount),
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    res.status(500).json({ message: "Unable to validate coupon." });
  }
});

// Admin: list all coupons
router.get("/", protectAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({ message: "Unable to load coupons." });
  }
});

// Admin: create coupon
router.post("/", protectAdmin, async (req, res) => {
  try {
    const data = cleanCouponData(req.body);
    const validationError = validateCouponData(data);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existing = await Coupon.findOne({ code: data.code });

    if (existing) {
      return res.status(409).json({
        message: "A coupon with this code already exists.",
      });
    }

    const coupon = await Coupon.create(data);

    res.status(201).json({
      message: "Coupon created successfully.",
      coupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A coupon with this code already exists.",
      });
    }

    res.status(500).json({ message: "Unable to create coupon." });
  }
});

// Admin: update coupon
router.put("/:id", protectAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid coupon ID." });
    }

    const data = cleanCouponData(req.body);
    const validationError = validateCouponData(data);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await Coupon.findOne({
      code: data.code,
      _id: { $ne: req.params.id },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Another coupon already uses this code.",
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    res.json({ message: "Coupon updated successfully.", coupon });
  } catch (error) {
    console.error("Update coupon error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A coupon with this code already exists.",
      });
    }

    res.status(500).json({ message: "Unable to update coupon." });
  }
});

// Admin: activate or deactivate coupon
router.patch("/:id/status", protectAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid coupon ID." });
    }

    if (typeof req.body.active !== "boolean") {
      return res.status(400).json({
        message: "Provide active as true or false.",
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { active: req.body.active },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    res.json({
      message: `Coupon ${coupon.active ? "activated" : "deactivated"}.`,
      coupon,
    });
  } catch (error) {
    console.error("Coupon status error:", error);
    res.status(500).json({ message: "Unable to update coupon status." });
  }
});

// Admin: delete coupon
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid coupon ID." });
    }

    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    res.json({ message: "Coupon deleted successfully." });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({ message: "Unable to delete coupon." });
  }
});

module.exports = router;
