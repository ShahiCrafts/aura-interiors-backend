const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    firstName: {
      type: String,
      required: [true, "First name is required"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{7,15}$/, "Please enter a valid phone number"],
    },

    avatar: {
      type: String,
      default: null,
    },

    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    preferences: {
      newsletter: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      orderUpdates: { type: Boolean, default: true },
      promotionalEmails: { type: Boolean, default: false },
      preferredCategories: [
        {
          type: String,
          enum: [
            "living_room",
            "bedroom",
            "dining",
            "office",
            "outdoor",
            "storage",
            "decor",
          ],
        },
      ],
    },

    googleId: {
      type: String,
      sparse: true,
    },

    lastLogin: Date,
    loginCount: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next;

  this.password = await bcrypt.hash(this.password, 12);

  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

userSchema.methods.updateLoginActivity = function () {
  this.lastLogin = Date.now();
  this.loginCount += 1;
};

userSchema.statics.findActive = function () {
  return this.find({ isActive: true, deletedAt: null });
};

const User = mongoose.model("User", userSchema);
module.exports = User;
