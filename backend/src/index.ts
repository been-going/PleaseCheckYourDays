// e:/pleaseCheckYourDays/backend/src/index.ts
import app from "./app.js";
import dotenv from "dotenv";
import { config } from "./config/index.js";

dotenv.config();

// const PORT = process.env.PORT || 4001;

// app.listen(PORT, () => {
//   console.log(`🚀 Server is running on http://localhost:${PORT}`);
// });

// 0.0.0.0으로 명시적으로 바인딩하여 모든 네트워크 인터페이스에서 수신하도록 합니다.
// EC2와 같은 환경에서 public IP에 직접 바인딩 시도 시 발생하는 권한 문제를 방지합니다.
// process.env.PORT가 유효하지 않은 문자열일 경우 NaN이 될 수 있으므로, 안전하게 파싱합니다.
const portString = process.env.PORT || "4001";
const PORT = parseInt(portString, 10);
const HOST = "0.0.0.0";

if (isNaN(PORT)) {
  console.error(
    `Error: Invalid PORT environment variable. Received "${portString}". Exiting.`
  );
  process.exit(1);
}

app.listen(PORT, HOST, () => {
  console.log(`✅ Environment: ${config.NODE_ENV}`);
  console.log(`🚀 Server is listening on ${HOST}:${PORT}`);
});
