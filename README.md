# Client Capture App

A simple Node.js web app that captures client information and stores it in a SQLite database.

## Features

- Form to submit client details (name, email, phone, notes)
- Data persisted in SQLite (`data/clients.db`)
- API endpoints:
  - `GET /api/clients`
  - `POST /api/clients`
- Table view of submitted clients

## Run locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).
