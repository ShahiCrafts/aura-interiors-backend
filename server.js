require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const csurf = require("csurf");
const passport = require("./config/passport");

const { connectDatabase } = require("./config/database");

connectDatabase();

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());

if (process.env.NODE_ENV !== "production") {
} else {
  app.use(csurf({ cookie: true }));
}

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 50,
  })
);

app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/addresses", require("./routes/address.routes"));
app.use("/api/v1/profile", require("./routes/profile.routes"));

// Serve static files for uploads
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
