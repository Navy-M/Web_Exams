import User from "../models/User.js";

export const getProfile = (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      id: decoded.id,
      role: decoded.role,
      email: decoded.email, // optional
    });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
};
