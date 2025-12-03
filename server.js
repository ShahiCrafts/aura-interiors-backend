const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const csurf = require("csurf");

const { connectDatabase } = require("./config/database");
require("dotenv").config();

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

app.use("/api/v1", require("./routes/index"));

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
