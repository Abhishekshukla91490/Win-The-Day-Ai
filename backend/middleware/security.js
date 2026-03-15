const helmet = require("helmet");
const compression = require("compression");

const securityMiddleware = helmet({
  contentSecurityPolicy: false,
});

const compressionMiddleware = compression();

module.exports = { securityMiddleware, compressionMiddleware };
