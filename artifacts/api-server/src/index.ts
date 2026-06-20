import app from "./app";
import { logger } from "./lib/logger";
const port = Number(process.env.PORT) || 5000;
app.listen(port, () => { logger.info({ port }, "Server listening"); });
