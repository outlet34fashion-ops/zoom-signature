// Load configuration from environment or config file
const path = require('path');
const fs = require('fs');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  devServer: (devServerConfig) => {
    if (process.env.HTTPS === 'true') {
      devServerConfig.https = {
        key: fs.readFileSync('/app/frontend/ssl/key.pem'),
        cert: fs.readFileSync('/app/frontend/ssl/cert.pem'),
      };
    }
    devServerConfig.allowedHosts = 'all';
    devServerConfig.host = '0.0.0.0';
    devServerConfig.port = 3000;
    return devServerConfig;
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