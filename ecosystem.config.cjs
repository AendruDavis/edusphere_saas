module.exports = {
  apps: [
    {
      name: "edusphere-saas",
      script: "dist/server.cjs",
      cwd: "/var/www/edusphere_saas",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
