const env = require("./config/env");
const app = require("./app");
const { ensureBucket } = require("./config/minio");

async function startServer(port) {
  await ensureBucket();

  const server = app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = Number(port) + 1;
      console.warn(`Port ${port} already in use, retrying on ${nextPort}`);
      setTimeout(() => startServer(nextPort), 200);
      return;
    }

    console.error("Server startup error:", err);
    process.exit(1);
  });
}

startServer(Number(env.port || 5000));
