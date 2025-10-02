import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token = req.cookies.token;

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    next();
  } catch (e) {
    res.status(401).json({ message: "Token failed" });
  }
};

export const admin = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });
  next();
};

