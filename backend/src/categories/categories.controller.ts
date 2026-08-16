import type { Request, Response, NextFunction } from "express";
import * as categoriesService from "./categories.service.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "./categories.validation.js";

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await categoriesService.listCategories();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const category = await categoriesService.createCategory(parsed.data);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const params = categoryIdParamSchema.safeParse(req.params);
  const body = updateCategorySchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: {
        ...(!params.success && params.error.flatten().fieldErrors),
        ...(!body.success && body.error.flatten().fieldErrors),
      },
    });
  }

  try {
    const category = await categoriesService.updateCategory(
      params.data.id,
      body.data,
    );
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  const parsed = categoryIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    await categoriesService.deleteCategory(parsed.data.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = categoryIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const category = await categoriesService.getCategoryById(parsed.data.id);
    res.json(category);
  } catch (err) {
    next(err);
  }
}
