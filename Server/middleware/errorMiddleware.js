const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // 🔎 Mongoose: Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ID: ${err.value}`;
  }

  // 📛 Mongoose: Validation Errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // 🔐 JWT: Invalid Token
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  // ⌛ JWT: Expired Token
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
  }

  // 🔁 MongoDB: Duplicate Key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field: '${field}' already exists.`;
  }

  // ❌ Express-validator
  if (err.errors && Array.isArray(err.errors)) {
    statusCode = 400;
    message = err.errors.map((e) => e.msg).join(", ");
  }

  // 🛑 Final response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
