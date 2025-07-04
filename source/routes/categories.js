import express from "express";
import CategoryController from "../controllers/Category.controller.js";
import { isAdmin, isAuth } from "../middlewares/auth.middleware.js";
import { publicApiLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Routes công khai - áp dụng publicApiLimiter
router.get("/", publicApiLimiter, CategoryController.getAllCategories);
router.get("/:id", publicApiLimiter, CategoryController.getCategoryById);
router.get(
  "/slug/:slug",
  publicApiLimiter,
  CategoryController.getCategoryBySlug
);

router.get(
  "/home/slug/:slug",
  publicApiLimiter,
  CategoryController.getCategoryHomeBySlug
);
router.get(
  "/:id/children",
  publicApiLimiter,
  CategoryController.getChildCategories
);

// Routes yêu cầu quyền admin
router.post("/", CategoryController.createCategory);
router.put("/:id", CategoryController.updateCategory);
router.delete("/:id", CategoryController.deleteCategory);

export default router;
