// PM2 process file for running without Docker.  Start:  pm2 start deploy/ecosystem.config.cjs && pm2 save
// Keep a SINGLE instance: the login/inquiry rate limiter lives in memory (see README → Scaling).
module.exports = {
  apps: [
    {
      name: "tripleaint",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname + "/..",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "800M",
      env: { NODE_ENV: "production" },
    },
  ],
};
