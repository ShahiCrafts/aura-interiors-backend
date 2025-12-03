const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "aura_interiors_db",
    });
    console.log("MongoDb Connection Succeeded!");
  } catch (error) {
    console.error("MongoDb Connection failed!", error.message);
    process.exit(1);
  }
};

module.exports = { connectDatabase };
