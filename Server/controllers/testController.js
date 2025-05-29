import Test from "../models/Test.js";

export const createTest = async (req, res, next) => {
  try {
    const test = await Test.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(test);
  } catch (e) {
    next(e);
  }
};
export const getTests = async (req, res, next) => {
  try {
    const tests = await Test.find();
    res.json(tests);
  } catch (e) {
    next(e);
  }
};
export const getTestById = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    res.json(test);
  } catch (e) {
    next(e);
  }
};
export const updateTest = async (req, res, next) => {
  try {
    const updated = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
};
export const deleteTest = async (req, res, next) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) {
    next(e);
  }
};
export const assignTest = async (req, res, next) => {
  try {
    const { userIds, deadline } = req.body;
    const test = await Test.findById(req.params.id);
    test.assignedTo.push(...userIds.map((u) => ({ user: u, deadline })));
    await test.save();
    res.json(test);
  } catch (e) {
    next(e);
  }
};
export const getTestResults = async (req, res, next) => {
  try {
    /* implement UserTest lookup */
  } catch (e) {
    next(e);
  }
};
