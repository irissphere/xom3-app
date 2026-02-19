/**
 * PM2 Ecosystem Configuration - EXOM3 Engine Room
 * 
 * Architecture:
 * - Core API (3001): Main backend + all non-engine routes
 * - HPE (3002): Healthcare Pipeline Engine routes
 * - HSE (3003): Hyperstate Engine routes
 * - UOI (3004): Unified Operational Intelligence routes
 * - Sync (3005): Airtable/data sync routes
 * - Internal (3006): Internal ops + health checks
 * 
 * NOTE: Currently all services run the same Next.js app.
 * Routes are differentiated by port. Nginx routes to appropriate ports.
 * 
 * Future: Can split into separate Node services if needed.
 */

module.exports = {
  apps: [
    // ========================================================================
    // CORE API (Port 3001)
    // ========================================================================
    {
      name: 'exom3-core',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        SERVICE_NAME: 'core',
        // Add your env vars here or load from .env
      },
      
      error_file: '/var/log/pm2/exom3-core-error.log',
      out_file: '/var/log/pm2/exom3-core-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ========================================================================
    // HPE - Healthcare Pipeline Engine (Port 3002)
    // ========================================================================
    {
      name: 'exom3-hpe',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        SERVICE_NAME: 'hpe',
      },
      
      error_file: '/var/log/pm2/exom3-hpe-error.log',
      out_file: '/var/log/pm2/exom3-hpe-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ========================================================================
    // HSE - Hyperstate Engine (Port 3003)
    // ========================================================================
    {
      name: 'exom3-hse',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
        SERVICE_NAME: 'hse',
      },
      
      error_file: '/var/log/pm2/exom3-hse-error.log',
      out_file: '/var/log/pm2/exom3-hse-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ========================================================================
    // UOI - Unified Operational Intelligence (Port 3004)
    // ========================================================================
    {
      name: 'exom3-uoi',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3004',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: '3004',
        SERVICE_NAME: 'uoi',
      },
      
      error_file: '/var/log/pm2/exom3-uoi-error.log',
      out_file: '/var/log/pm2/exom3-uoi-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ========================================================================
    // SYNC ENGINE (Port 3005)
    // ========================================================================
    {
      name: 'exom3-sync',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: '3005',
        SERVICE_NAME: 'sync',
      },
      
      error_file: '/var/log/pm2/exom3-sync-error.log',
      out_file: '/var/log/pm2/exom3-sync-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ========================================================================
    // INTERNAL OPS (Port 3006)
    // ========================================================================
    {
      name: 'exom3-internal',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3006',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: '3006',
        SERVICE_NAME: 'internal',
      },
      
      error_file: '/var/log/pm2/exom3-internal-error.log',
      out_file: '/var/log/pm2/exom3-internal-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
