// Load configuration from environment or config file
const path = require('path');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  devServer: {
    https: process.env.HTTPS === 'true' ? {
      key: process.env.SSL_KEY_FILE ? require('fs').readFileSync(process.env.SSL_KEY_FILE) : undefined,
      cert: process.env.SSL_CRT_FILE ? require('fs').readFileSync(process.env.SSL_CRT_FILE) : undefined,
    } : false,
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 3000,
    client: {
      webSocketURL: {
        port: 3000,
        protocol: process.env.HTTPS === 'true' ? 'wss' : 'ws',
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      
      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });
        
        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }
      
      return webpackConfig;
    },
  },
};