import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import * as ctrl from "../controllers/testController.js";
const router = express.Router();
router.use(protect);
router.route("/").get(ctrl.getTests).post(admin, ctrl.createTest);
router
  .route("/:id")
  .get(ctrl.getTestById)
  .put(admin, ctrl.updateTest)
  .delete(admin, ctrl.deleteTest);
router.post("/:id/assign", admin, ctrl.assignTest);
export default router;
