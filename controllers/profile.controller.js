const path = require("path");
const fs = require("fs");
const User = require("../models/user.model");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender, dateOfBirth } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "Please upload an image",
      });
    }

    // Delete old avatar if exists
    const currentUser = await User.findById(req.user.id);
    if (currentUser.avatar) {
      const oldAvatarPath = path.join(
        __dirname,
        "../uploads/avatars",
        currentUser.avatar
      );
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: req.file.filename },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.removeAvatar = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (currentUser.avatar) {
      const avatarPath = path.join(
        __dirname,
        "../uploads/avatars",
        currentUser.avatar
      );
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: null },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const {
      newsletter,
      smsNotifications,
      orderUpdates,
      promotionalEmails,
      preferredCategories,
    } = req.body;

    const updateData = { preferences: {} };

    if (newsletter !== undefined)
      updateData.preferences.newsletter = newsletter;
    if (smsNotifications !== undefined)
      updateData.preferences.smsNotifications = smsNotifications;
    if (orderUpdates !== undefined)
      updateData.preferences.orderUpdates = orderUpdates;
    if (promotionalEmails !== undefined)
      updateData.preferences.promotionalEmails = promotionalEmails;
    if (preferredCategories !== undefined)
      updateData.preferences.preferredCategories = preferredCategories;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // Soft delete
    await User.findByIdAndUpdate(req.user.id, {
      isActive: false,
      deletedAt: Date.now(),
    });

    res.cookie("jwt", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      status: "success",
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
