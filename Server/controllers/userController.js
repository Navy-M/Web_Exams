import User from "../models/User.js";

export const getProfile = (req, res) => res.json(req.user);

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
};
