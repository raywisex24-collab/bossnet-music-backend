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
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
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
