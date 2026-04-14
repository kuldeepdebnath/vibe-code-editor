const express = require('express');
const { resolve } = require('path');

const app = express();
const port = process.env.PORT || 3010;
const host = process.env.HOST || '0.0.0.0';

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(resolve(__dirname, 'pages/index.html'));
});

app.listen(port, host, () => {
  console.log(`Example app listening at http://${host}:${port}`);
});
