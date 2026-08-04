import * as http from "http";
const options = {
  hostname: 'api-inference.huggingface.co',
  port: 80,
  path: '/',
  method: 'OPTIONS',
};
const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
});
req.on('error', (e) => {
  console.error(e.message);
});
req.end();
