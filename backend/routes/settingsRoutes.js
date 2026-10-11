
const express = require("express");
const router = express.Router();

const StoreSettings = require("../models/StoreSettings");
const protectAdmin = require("../middleware/authMiddleware");
// Get shipping settings (public checkout)
router.get("/shipping", async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = await StoreSettings.create({
        freeShipping: true,
        shippingFee: 0,
      });
    }

    res.json({
      freeShipping: settings.freeShipping,
      shippingFee: settings.freeShipping
        ? 0
        : settings.shippingFee,
    });
  } catch (error) {
    console.error("Shipping settings error:", error);
    res.status(500).json({
      message: "Failed to load shipping settings",
    });
  }
});

// Update shipping settings (admin only)
router.put("/shipping", protectAdmin, async (req, res) => {
  try {
    const { freeShipping, shippingFee } = req.body;

    if (typeof freeShipping !== "boolean") {
      return res.status(400).json({
        message: "Please select a shipping option",
      });
    }

    const fee = Number(shippingFee);

    if (
      !freeShipping &&
      (!Number.isFinite(fee) || fee < 0)
    ) {
      return res.status(400).json({
        message: "Enter a valid shipping fee",
      });
    }

    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = new StoreSettings();
    }

    settings.freeShipping = freeShipping;
    settings.shippingFee = freeShipping ? 0 : fee;

    await settings.save();

    res.json({
      message: "Shipping settings saved successfully",
      freeShipping: settings.freeShipping,
      shippingFee: settings.shippingFee,
    });
  } catch (error) {
    console.error("Update shipping settings error:", error);
    res.status(500).json({
      message: "Failed to save shipping settings",
    });
  }
});

module.exports = router;
