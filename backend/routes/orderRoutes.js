
const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const StoreSettings = require("../models/StoreSettings");
const protectAdmin = require("../middleware/authMiddleware");
const sendOrderConfirmationEmail = require("../utils/sendOrderConfirmationEmail");

const router = express.Router();

// CUSTOMER: Place a guest checkout order
router.post("/", async (req, res) => {
  try {
    const { customer, items } = req.body;

    const couponCode = String(req.body.couponCode || "")
      .trim()
      .toUpperCase();

    if (
      !customer?.name?.trim() ||
      !customer?.email?.trim() ||
      !customer?.phone?.trim() ||
      !customer?.address?.trim() ||
      !customer?.city?.trim()
    ) {
      return res.status(400).json({
        message: "Please complete all delivery details.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty.",
      });
    }

    if (items.length > 50) {
      return res.status(400).json({
        message: "Too many different items in one order.",
      });
    }

    const orderItems = [];
    let subtotal = 0;

    // Calculate current product prices on the server.
    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId)) {
        return res.status(400).json({
          message: "A cart item has an invalid product ID.",
        });
      }

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        return res.status(400).json({
          message: "Each quantity must be between 1 and 99.",
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          message: "A product in your cart is no longer available.",
        });
      }

      // Preserve existing stock-check behavior.
      if (
        Number(product.stock) > 0 &&
        quantity > Number(product.stock)
      ) {
        return res.status(400).json({
          message: `${product.name} has only ${product.stock} item(s) available.`,
        });
      }

      const originalPrice = Number(product.price);

      if (!Number.isFinite(originalPrice) || originalPrice < 0) {
        return res.status(400).json({
          message: `The price for ${product.name} is invalid.`,
        });
      }

      const productDiscountPercent = Math.min(
        90,
        Math.max(0, Number(product.discountPercent) || 0)
      );

      // Apply the product's direct discount first.
      const price = Math.round(
        originalPrice * (1 - productDiscountPercent / 100)
      );

      subtotal += price * quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        price,
        quantity,
        selectedSize:
          typeof item.selectedSize === "string"
            ? item.selectedSize.slice(0, 50)
            : "",
        selectedColor:
          typeof item.selectedColor === "string"
            ? item.selectedColor.slice(0, 50)
            : "",
      });
    }

    // Validate coupon on the server.
    let appliedCouponCode = "";
    let discountAmount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        active: true,
        expiresAt: { $gt: new Date() },
      });

      if (!coupon) {
        return res.status(400).json({
          message: "This coupon is invalid, inactive, or expired.",
        });
      }

      const minOrderAmount = Number(coupon.minOrderAmount || 0);

      if (subtotal < minOrderAmount) {
        return res.status(400).json({
          message: `Minimum order for this coupon is PKR ${minOrderAmount.toLocaleString()}.`,
        });
      }

      const percentOff = Number(coupon.percentOff);

      if (
        !Number.isFinite(percentOff) ||
        percentOff < 1 ||
        percentOff > 90
      ) {
        return res.status(400).json({
          message: "This coupon has an invalid discount setting.",
        });
      }

      // Coupon applies to the subtotal after product discounts.
      discountAmount = Math.min(
        subtotal,
        Math.round((subtotal * percentOff) / 100)
      );

      appliedCouponCode = coupon.code;
    }

    // Use the shipping settings configured by the admin.
    const settings = await StoreSettings.findOne();

    const freeShipping = settings
      ? settings.freeShipping
      : true;

    const shippingFee = freeShipping
      ? 0
      : Number(settings?.shippingFee || 0);

    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      return res.status(500).json({
        message: "Store shipping settings are invalid.",
      });
    }

    // Final total is always calculated by the backend.
    const total =
      Math.max(0, subtotal - discountAmount) + shippingFee;

    const orderNumber = `ROSHE-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const order = await Order.create({
      orderNumber,

      customer: {
        name: customer.name.trim().slice(0, 100),
        email: customer.email.trim().toLowerCase().slice(0, 150),
        phone: customer.phone.trim().slice(0, 30),
        address: customer.address.trim().slice(0, 500),
        city: customer.city.trim().slice(0, 100),
      },

      items: orderItems,
      subtotal,
      couponCode: appliedCouponCode,
      discountAmount,
      shippingFee,
      total,
      paymentMethod: "COD",
    });

    // Send confirmation email after the order has been saved.
    // Email failure must not cancel the order.
    try {
      await sendOrderConfirmationEmail(order);

      console.log(
        `Order confirmation email sent to ${order.customer.email}`
      );
    } catch (emailError) {
      console.error(
        `Order ${order.orderNumber} was saved, but its confirmation email failed:`,
        emailError.message
      );
    }

    return res.status(201).json({
      message: "Your order has been placed successfully.",

      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        couponCode: order.couponCode,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        total: order.total,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Place order error:", error);

    return res.status(500).json({
      message: "Could not place your order. Please try again.",
    });
  }
});

// ADMIN: Dashboard statistics
router.get("/stats/summary", protectAdmin, async (req, res) => {
  try {
    const [
      totalOrders,
      revenueResult,
      customersFromOrders,
      registeredCustomerEmails,
    ] = await Promise.all([
      Order.countDocuments(),

      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
          },
        },
      ]),

      Order.distinct("customer.email"),

      User.distinct("email", { role: "customer" }),
    ]);

    // Count unique email addresses across guest orders and accounts.
    const customerEmails = new Set(
      [...customersFromOrders, ...registeredCustomerEmails]
        .filter(Boolean)
        .map((email) => String(email).trim().toLowerCase())
    );

    return res.json({
      totalOrders,
      customers: customerEmails.size,
      revenue: revenueResult[0]?.revenue || 0,
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error);

    return res.status(500).json({
      message: "Failed to load order statistics.",
    });
  }
});

// ADMIN: Customer list from guest orders and registered accounts
router.get("/customers", protectAdmin, async (req, res) => {
  try {
    const [orderCustomers, registeredCustomers] = await Promise.all([
      Order.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { $toLower: "$customer.email" },
            name: { $first: "$customer.name" },
            email: { $first: "$customer.email" },
            phone: { $first: "$customer.phone" },
            city: { $first: "$customer.city" },
            orders: { $sum: 1 },
            lastOrderAt: { $first: "$createdAt" },
          },
        },
        { $sort: { lastOrderAt: -1 } },
      ]),

      User.find({ role: "customer" })
        .select("name email createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const customerMap = new Map();

    for (const customer of orderCustomers) {
      const emailKey = String(customer.email || customer._id)
        .trim()
        .toLowerCase();

      customerMap.set(emailKey, {
        ...customer,
        source: "order",
        registeredAt: null,
      });
    }

    for (const user of registeredCustomers) {
      const emailKey = String(user.email || "")
        .trim()
        .toLowerCase();

      if (!emailKey) continue;

      const existing = customerMap.get(emailKey);

      customerMap.set(emailKey, {
        ...(existing || {}),
        name: user.name || existing?.name || "",
        email: user.email,
        registeredAt: user.createdAt,
        orders: existing?.orders || 0,
        phone: existing?.phone || "",
        city: existing?.city || "",
        lastOrderAt: existing?.lastOrderAt || null,
        source: existing ? "registered-and-ordered" : "registered",
      });
    }

    return res.json(Array.from(customerMap.values()));
  } catch (error) {
    console.error("Load customers error:", error);

    return res.status(500).json({
      message: "Failed to load customers.",
    });
  }
});

// ADMIN: Remove a guest customer only when no orders remain
router.delete("/customers/guest", protectAdmin, async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Please provide a valid customer email.",
      });
    }

    // Escape regex characters from the supplied email.
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactEmail = { $regex: `^${escapedEmail}$`, $options: "i" };

    const registeredAccount = await User.findOne({
      email: exactEmail,
      role: "customer",
    });

    if (registeredAccount) {
      return res.status(409).json({
        message:
          "This customer has a registered account. It cannot be removed from this page.",
      });
    }

    const remainingOrders = await Order.countDocuments({
      "customer.email": exactEmail,
    });

    if (remainingOrders > 0) {
      return res.status(409).json({
        message:
          "This customer still has orders. Delete or retain those orders before removing the customer from the list.",
      });
    }

    return res.json({
      message:
        "This guest no longer has orders and will not appear in the customer list.",
      email,
    });
  } catch (error) {
    console.error("Remove guest customer error:", error);

    return res.status(500).json({
      message: "Failed to remove guest customer.",
    });
  }
});

// ADMIN: Get all orders
router.get("/", protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders);
  } catch (error) {
    console.error("Load orders error:", error);

    return res.status(500).json({
      message: "Failed to load orders.",
    });
  }
});

// ADMIN: Delete a single order
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.json({
      message: "Order deleted successfully.",
      deletedOrderId: order._id,
    });
  } catch (error) {
    console.error("Delete order error:", error);

    return res.status(500).json({
      message: "Failed to delete order.",
    });
  }
});

// ADMIN: Update order status
router.patch("/:id/status", protectAdmin, async (req, res) => {
  try {
    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    order.status = status;
    await order.save();

    return res.json({
      message: "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      message: "Failed to update order status.",
    });
  }
});

module.exports = router;
