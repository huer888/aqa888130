module.exports = {
  apps: [
    {
      name: 'stake-parceiros',
      script: 'node_modules/.bin/tsx',
      args: 'src/run-server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
    }
  ]
}
