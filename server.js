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
const globalErrorHandler = require("./middleware/error.middleware");
const AppError = require("./utils/AppError");

connectDatabase();

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

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
app.use("/api/v1/categories", require("./routes/category.routes"));
app.use("/api/v1/products", require("./routes/product.routes"));
app.use("/api/v1/wishlist", require("./routes/wishlist.routes"));
app.use("/api/v1/cart", require("./routes/cart.routes"));
app.use("/api/v1/discounts", require("./routes/discount.routes"));
app.use("/api/v1/orders", require("./routes/order.routes"));

// Serve static files for uploads
app.use("/uploads", express.static("uploads"));

// Handle undefined routes (Express 5 syntax)
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(globalErrorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
