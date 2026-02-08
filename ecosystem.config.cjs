module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'node_modules/.bin/tsx',
      args: 'src/run-server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      watch: false,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: 5000,
      error_file: "server.error.log",
      out_file: "server.out.log"
    }
  ]
}
