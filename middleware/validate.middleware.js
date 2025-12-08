const AppError = require("../utils/AppError");

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(". ");
      return next(new AppError(errorMessage, 400));
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
