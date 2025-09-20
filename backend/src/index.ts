// e:/pleaseCheckYourDays/backend/src/index.ts
import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
