require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const { connectDatabase } = require("../config/database");

const ADMIN_DATA = {
  firstName: "Admin",
  lastName: "User",
  email: process.env.ADMIN_EMAIL || "admin@aurainteriors.com",
  password: process.env.ADMIN_PASSWORD || "Admin@123456",
  role: "admin",
  isEmailVerified: true,
  isActive: true,
};

const seedAdmin = async () => {
  try {
    await connectDatabase();

    const existingAdmin = await User.findOne({ email: ADMIN_DATA.email });

    if (existingAdmin) {
      console.log("Admin user already exists:");
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Role: ${existingAdmin.role}`);
      process.exit(0);
    }

    const admin = await User.create(ADMIN_DATA);

    console.log("Admin user created successfully:");
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: ${ADMIN_DATA.password}`);
    console.log(`  Role: ${admin.role}`);
    console.log("\n⚠️  Please change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
