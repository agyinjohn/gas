module.exports = {
  apps: [
    {
      name:   'getgas-api',
      script: 'dist/index.js',

      // dotenv.config() in src/index.ts resolves .env relative to cwd,
      // so this must be the backend dir. __dirname keeps it portable.
      cwd: __dirname,

      // ─────────────────────────────────────────────────────────────────
      // DO NOT CHANGE THESE TWO.
      // Dispatch locks, Socket.IO rooms, rider presence, cron jobs and
      // rate limiting are all in-process. Cluster mode = duplicate
      // refunds, missed rider dispatches, and N× cron runs.
      // ─────────────────────────────────────────────────────────────────
      exec_mode: 'fork',
      instances: 1,

      // Wins over NODE_ENV=development in .env — dotenv does not
      // override variables that are already set in the environment.
      env: {
        NODE_ENV: 'production',
      },

      // Heap ceiling below max_memory_restart so V8 collects hard
      // before PM2 kills the process. Sized for a 2GB box.
      node_args: '--max-old-space-size=768',

      autorestart:        true,
      max_memory_restart: '1G',
      min_uptime:         '30s',
      max_restarts:       10,
      restart_delay:      4000,
      kill_timeout:       10000,

      watch: false,

      time:       true,
      merge_logs: true,
      out_file:   'logs/out.log',
      error_file: 'logs/error.log',
    },
  ],
};
