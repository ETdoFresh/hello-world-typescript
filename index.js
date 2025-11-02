const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hello World</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          }
          h1 {
            color: #667eea;
            margin: 0 0 1rem 0;
          }
          p {
            color: #666;
            font-size: 1.2rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 Hello World from TypeScript!</h1>
          <p>This app is running successfully on port ${port}!</p>
          <p>Built with Express and deployed with Dokploy</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✨ Server running on port ${port}`);
  console.log(`Visit http://localhost:${port} to see the app`);
});
