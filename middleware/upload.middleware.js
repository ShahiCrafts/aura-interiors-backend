const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const AppError = require("../utils/AppError");

const UPLOAD_BASE_DIR = path.join(__dirname, "../uploads");

const generateFileName = (prefix) => {
  const uniqueId = crypto.randomBytes(8).toString("hex");
  return `${prefix}-${Date.now()}-${uniqueId}.jpeg`;
};

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadAvatar = upload.single("avatar");

exports.resizeAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const uploadsDir = path.join(UPLOAD_BASE_DIR, "avatars");
    await ensureDirectoryExists(uploadsDir);

    req.file.filename = generateFileName(`user-${req.user.id}`);

    await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" })
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(path.join(uploadsDir, req.file.filename));

    next();
  } catch (error) {
    next(new AppError("Error processing image. Please try again.", 500));
  }
};

exports.uploadCategoryImage = upload.single("image");

exports.resizeCategoryImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const uploadsDir = path.join(UPLOAD_BASE_DIR, "categories");
    await ensureDirectoryExists(uploadsDir);

    req.file.filename = generateFileName("category");

    await sharp(req.file.buffer)
      .resize(800, 600, { fit: "cover" })
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(path.join(uploadsDir, req.file.filename));

    next();
  } catch (error) {
    next(new AppError("Error processing image. Please try again.", 500));
  }
};

exports.uploadProductImages = upload.array("images", 10);

exports.resizeProductImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return next();

    const uploadsDir = path.join(UPLOAD_BASE_DIR, "products");
    await ensureDirectoryExists(uploadsDir);

    await Promise.all(
      req.files.map(async (file) => {
        const filename = generateFileName("product");
        file.filename = filename;

        await sharp(file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(path.join(uploadsDir, filename));
      })
    );

    next();
  } catch (error) {
    next(new AppError("Error processing images. Please try again.", 500));
  }
};

exports.deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file: ${filePath}`, error.message);
  }
};

exports.deleteFiles = async (filePaths) => {
  await Promise.all(filePaths.map((filePath) => exports.deleteFile(filePath)));
};
