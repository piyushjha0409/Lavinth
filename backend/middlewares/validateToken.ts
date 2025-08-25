import { NextFunction, Request, Response } from "express";

const VALID_TOKEN = process.env.API_KEY;

export function validateToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-access-token"];

  if (!token) {
    res.status(401).json({
      status: "error",
      message: "No token provided",
    });
    return;
  }

  if (token !== VALID_TOKEN) {
    res.status(401).json({
      status: "error",
      message: "Invalid token",
    });
    return;
  }

  next();
}
