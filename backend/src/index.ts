import { createApp } from "./app.js";
import { formatTimestamp } from "./utils/logger.js";

const port = Number(process.env.PORT) || 4000;
const environment = process.env.NODE_ENV?.trim() || "development";
const serverUrl = `http://localhost:${port}`;
const app = createApp();

app.listen(port, () => {
  console.log("");
  console.log("========================================");
  console.log(" KnowledgeBaseChat Backend");
  console.log(` ${formatTimestamp()} Startup`);
  console.log(` Environment: ${environment}`);
  console.log(` Server URL:  ${serverUrl}`);
  console.log(" Status:      running");
  console.log("========================================");
  console.log("");
});
