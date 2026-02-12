const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'clients.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function runSql(args) {
  return new Promise((resolve, reject) => {
    execFile('sqlite3', args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

async function initializeDatabase() {
  const sql = `
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await runSql([DB_PATH, sql]);
}

async function createClient(client) {
  const name = escapeSql(client.name);
  const email = escapeSql(client.email);
  const phone = escapeSql(client.phone || '');
  const notes = escapeSql(client.notes || '');

  const insertSql = `
    INSERT INTO clients (name, email, phone, notes)
    VALUES ('${name}', '${email}', '${phone}', '${notes}');
    SELECT last_insert_rowid() AS id;
  `;

  const insertedId = await runSql([DB_PATH, '-json', insertSql]);
  const parsed = JSON.parse(insertedId || '[]');
  return parsed[0]?.id;
}

async function listClients() {
  const rows = await runSql([
    DB_PATH,
    '-json',
    'SELECT id, name, email, phone, notes, created_at FROM clients ORDER BY id DESC;'
  ]);
  return JSON.parse(rows || '[]');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/clients') {
      const clients = await listClients();
      sendJson(res, 200, { clients });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/clients') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          if (!data.name || !data.email) {
            sendJson(res, 400, { error: 'Name and email are required.' });
            return;
          }

          const id = await createClient(data);
          sendJson(res, 201, { id, message: 'Client saved successfully.' });
        } catch (error) {
          sendJson(res, 400, { error: 'Invalid request body.' });
        }
      });
      return;
    }

    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/public/'))) {
      const filePath =
        req.url === '/'
          ? path.join(PUBLIC_DIR, 'index.html')
          : path.join(__dirname, req.url);

      serveFile(res, filePath);
      return;
    }

    if (req.method === 'GET' && req.url === '/styles.css') {
      serveFile(res, path.join(PUBLIC_DIR, 'styles.css'));
      return;
    }

    if (req.method === 'GET' && req.url === '/app.js') {
      serveFile(res, path.join(PUBLIC_DIR, 'app.js'));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found.' }));
  } catch (error) {
    sendJson(res, 500, { error: 'Internal server error.' });
  }
});

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });
