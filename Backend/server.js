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
const taskRoutes = require("./routes/taskRoutes"); // Task management system
// Temporarily commenting out mail routes due to undefined function issue
// const mailRoutes = require("./routes/mailRoutes"); // Mail system
// const notificationRoutes = require("./routes/notificationRoutes"); // Removed notification system


const app = express();

app.use(cors({
  origin: [
    'https://sbpi-2.onrender.com',        // Backend URL
    'https://sbpi-f3cb.vercel.app',       // Vercel frontend (current deployment)
    'https://sbpi-htaa.vercel.app',       // Previous Vercel deployment (keep for compatibility)
    'http://localhost:3000',               // Local development
    'http://localhost:3001'                // Local development alternative port
  ],
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
app.use("/api/tasks", taskRoutes); // Task management system
// Temporarily commenting out mail routes due to undefined function issue
// app.use("/api/mail", mailRoutes); // Mail system
// app.use("/api/notifications", notificationRoutes); // Removed notification system

// Add a test route to verify the server is running
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

// Policy and information pages for payment gateway (e.g., Razorpay)
app.get('/privacy-policy', (req, res) => {
  res.send('<h1>Privacy Policy</h1><p>Privacy Policy content will be added here.</p>');
});

app.get('/terms-and-conditions', (req, res) => {
  res.send('<h1>Terms and Conditions</h1><p>Terms and Conditions content will be added here.</p>');
});

app.get('/cancellation-and-refund', (req, res) => {
  res.send('<h1>Cancellation and Refund Policy</h1><p>Cancellation and Refund policy content will be added here.</p>');
});

app.get('/shipping-and-delivery', (req, res) => {
  res.send('<h1>Shipping and Delivery Policy</h1><p>Shipping and Delivery policy content will be added here.</p>');
});

app.get('/contact-us', (req, res) => {
  res.send('<h1>Contact Us</h1><p>Contact information will be added here.</p>');
});

// Add a health check endpoint for connection testing
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

// Import the enhanced database connection
const { connectDB } = require("./config/db");

// Connect to database with ACID compliance
connectDB()
    .then(() => app.listen(PORT, () => console.log(` Server running on port ${PORT}`)))
    .catch((err) => console.log(err));