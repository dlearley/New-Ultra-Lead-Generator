const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (req, res) => {
  if (req.url.startsWith('/api')) {
    createProxyMiddleware({
      target: process.env.API_URL || 'http://localhost:3002',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api',
      },
    })(req, res);
  } else {
    next();
  }
};