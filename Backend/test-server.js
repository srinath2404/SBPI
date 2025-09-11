// Simple test to verify server can start
const express = require("express");
const app = express();

app.get("/test", (req, res) => {
    res.json({ message: "Server test successful" });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
