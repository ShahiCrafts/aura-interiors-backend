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

// Filter for 3D model files
const modelFileFilter = (req, file, cb) => {
  if (file.fieldname === 'images') {
    // Image files
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new AppError("Please upload only images for the images field", 400), false);
    }
  } else if (file.fieldname === 'modelFiles') {
    // 3D model files
    const allowedExtensions = ['.glb', '.gltf', '.usdz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError("Please upload only .glb, .gltf, or .usdz files for 3D models", 400), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Upload config for products with both images and 3D models
const productUpload = multer({
  storage: multerStorage,
  fileFilter: modelFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for 3D models
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

// Upload handler for products with both images and 3D models
exports.uploadProductFiles = productUpload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'modelFiles', maxCount: 5 },
]);

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

// Process product files (images and 3D models)
exports.processProductFiles = async (req, res, next) => {
  try {
    const imagesDir = path.join(UPLOAD_BASE_DIR, "products");
    const modelsDir = path.join(UPLOAD_BASE_DIR, "models");

    await ensureDirectoryExists(imagesDir);
    await ensureDirectoryExists(modelsDir);

    // Process images
    if (req.files?.images && req.files.images.length > 0) {
      await Promise.all(
        req.files.images.map(async (file) => {
          const filename = generateFileName("product");
          file.filename = filename;

          await sharp(file.buffer)
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .toFormat("jpeg")
            .jpeg({ quality: 90 })
            .toFile(path.join(imagesDir, filename));
        })
      );
    }

    // Process 3D model files (just save them, no processing needed)
    if (req.files?.modelFiles && req.files.modelFiles.length > 0) {
      await Promise.all(
        req.files.modelFiles.map(async (file) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueId = crypto.randomBytes(8).toString("hex");
          const filename = `model-${Date.now()}-${uniqueId}${ext}`;
          file.filename = filename;
          file.fileSize = file.size;
          file.format = ext.replace('.', '');

          // Determine platform based on format
          if (ext === '.usdz') {
            file.platform = 'ios';
          } else if (ext === '.glb' || ext === '.gltf') {
            file.platform = 'android'; // GLB/GLTF works on both but primarily Android
          } else {
            file.platform = 'universal';
          }

          await fs.writeFile(path.join(modelsDir, filename), file.buffer);
        })
      );
    }

    next();
  } catch (error) {
    console.error("Error processing product files:", error);
    next(new AppError("Error processing files. Please try again.", 500));
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
