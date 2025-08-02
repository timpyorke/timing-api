const http = require('http');

const options = {
  hostname: '0.0.0.0',
  port: process.env.PORT || 8000,
  path: '/health',
  timeout: 5000
};

const request = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('Health check passed:', data);
      process.exit(0);
    } else {
      console.log('Health check failed:', res.statusCode, data);
      process.exit(1);
    }
  });
});

request.on('error', (err) => {
  console.log('Health check error:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('Health check timeout');
  request.destroy();
  process.exit(1);
});

request.setTimeout(5000);
request.end();