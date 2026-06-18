const env = require("./config/env");
const app = require("./app");

async function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (process.env.NODE_ENV === "production") {
        console.error(`Port ${port} already in use.`);
        process.exit(1);
      }

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
