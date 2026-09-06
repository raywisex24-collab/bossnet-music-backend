require("dotenv").config();

const express = require("express");
const cors = require("cors");

const musicRoutes = require("./routes/music");

const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
origin: [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://bossnet-app.vercel.app",
],
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());


// ==========================================
// BASIC TEST ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bossnet Music Backend is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
  });
});


// ==========================================
// MUSIC ROUTES
// ==========================================

app.use(
  "/api/music",
  musicRoutes
);


// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Bossnet Music Backend running on port ${PORT}`
  );
});
