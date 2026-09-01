module.exports = {
  apps: [
    {
      name: "edusphere-saas",
      script: "build/server.cjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
