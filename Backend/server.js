// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const workerRoutes = require("./routes/workerRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes"); // Ensure this is correctly imported
const sellRoutes = require("./routes/sellRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const rawMaterialRoutes = require("./routes/rawMaterialRoutes");
const workProgressRoutes = require("./routes/workProgressRoutes");
const priceRoutes = require("./routes/priceRoutes");
// OCR routes disabled as functionality has been removed from frontend
// const ocrRoutes = require("./routes/ocrRoutes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/inventory", inventoryRoutes); // Ensure this is correctly used
app.use("/api/sell", sellRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/raw-material", rawMaterialRoutes);
app.use("/api/work-progress", workProgressRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/price", priceRoutes);
// OCR routes disabled as functionality has been removed from frontend
// app.use("/api/ocr", ocrRoutes);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)))
    .catch((err) => console.log(err));