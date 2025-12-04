const Address = require("../models/address.model");

exports.getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      status: "success",
      results: addresses.length,
      data: {
        addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const {
      label,
      customLabel,
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    // If this is the first address, make it default
    const existingAddresses = await Address.countDocuments({ user: req.user.id });
    const shouldBeDefault = existingAddresses === 0 ? true : isDefault;

    const address = await Address.create({
      user: req.user.id,
      label,
      customLabel,
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const {
      label,
      customLabel,
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    // Update fields
    if (label !== undefined) address.label = label;
    if (customLabel !== undefined) address.customLabel = customLabel;
    if (type !== undefined) address.type = type;
    if (fullName !== undefined) address.fullName = fullName;
    if (phone !== undefined) address.phone = phone;
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (country !== undefined) address.country = country;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();

    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    const wasDefault = address.isDefault;
    await Address.findByIdAndDelete(req.params.id);

    // If deleted address was default, set another as default
    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: req.user.id }).sort({
        createdAt: -1,
      });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.status(200).json({
      status: "success",
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    address.isDefault = true;
    await address.save();

    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
