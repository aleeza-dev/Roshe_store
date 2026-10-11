
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const couponRoutes = require("./routes/couponRoutes");
const app = express();


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://roshe-store.vercel.app"
    ],
    credentials: true,
  })
);

app.use(express.json());

connectDB();

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/coupons", couponRoutes);
app.get("/", (req, res) => {
  res.send("ROSHE Backend is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
