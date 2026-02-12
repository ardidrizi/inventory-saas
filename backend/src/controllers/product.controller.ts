import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const findAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await productService.findAll({
      category: req.query.category as string,
      search: req.query.search as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const findById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.findById(req.params.id as string);
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.update(req.params.id as string, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.softDelete(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
