import dotenv from "dotenv";

dotenv.config();

const getConfig = () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      "Fatal Error: JWT_SECRET is not defined in environment variables."
    );
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
    JWT_SECRET: jwtSecret,
  };
};

export const config = getConfig();
