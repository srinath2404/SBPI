// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const workerRoutes = require("./routes/workerRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes"); // Ensure this is correctly imported
const sellRoutes = require("./routes/sellRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const rawMaterialRoutes = require("./routes/rawMaterialRoutes");
const workProgressRoutes = require("./routes/workProgressRoutes");
const priceRoutes = require("./routes/priceRoutes");
const priceChartRoutes = require("./routes/priceChartRoutes");
// const notificationRoutes = require("./routes/notificationRoutes"); // Removed notification system


const app = express();

app.use(cors({
  origin: ['https://sbpi-frontend.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(helmet({
	frameguard: false
}));
// Basic headers and cache policy for API
app.use((req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Cache-Control', 'no-store');
	next();
});
// Increase body size limits to handle base64-encoded images for OCR
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use("/api/auth", authRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sell", sellRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/raw-material", rawMaterialRoutes);
app.use("/api/work-progress", workProgressRoutes);
app.use("/api/price", priceRoutes);
app.use("/api/price-chart", priceChartRoutes);
// app.use("/api/notifications", notificationRoutes); // Removed notification system

// Add a test route to verify the server is running
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

const PORT = process.env.PORT || 5000;

// Import the enhanced database connection
const { connectDB } = require("./config/db");

// Connect to database with ACID compliance
connectDB()
    .then(() => app.listen(PORT, () => console.log(` Server running on port ${PORT}`)))
    .catch((err) => console.log(err));