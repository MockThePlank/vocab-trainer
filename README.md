# Fia's Vocabulary Trainer 🐾

An interactive German-English vocabulary trainer with multiple lessons, success animations, and persistent data storage.

## Features

### Frontend
- 🎯 **Drag & Drop**: Intuitive vocabulary pairing with collision detection
- 📚 **Multiple Lessons**: 4 lessons with 10-15 vocabulary pairs each
- 🎉 **Success Animations**: 5 random animations (confetti, balloons, rocket, unicorn, fireworks)
- ✨ **Toast Notifications**: Visual feedback for user actions
- 🎨 **Color Coding**: German (turquoise), English (purple), Solved (gray)
- ➕ **Vocabulary Form**: Collapsible form for adding new vocabulary
- 📚 **TypeScript**: Type-safe frontend code with DOM types
- 🗺️ **Source Maps**: Debugging support for TypeScript in the browser

### Backend
- 💾 **SQLite Database**: Persistent data storage with 53 vocabulary entries
- 🔒 **Security**: API key authentication, rate limiting, CORS, input validation
- 📝 **Structured Logs**: Winston logger with environment-specific formats
- 🏗️ **Modular Architecture**: Separation of routes, services, middleware
- 📚 **TypeScript**: Type safety with strict compiler options
- ✅ **Code Quality**: ESLint rules, JSDoc documentation
- 🚀 **Production-Ready**: Health checks, graceful shutdown, Render.com configuration

## Local Development

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Setup

1. **Clone the repository and install dependencies**:

```bash
npm install
```

2. **Configure environment variables**:

Copy the `.env.example` file to `.env` and configure your values:

```bash
cp .env.example .env
```

Then edit `.env` and set a secure admin API key:

```bash
ADMIN_API_KEY=your-secret-admin-key-change-this-in-production
```

You can generate a secure key with:
```bash
openssl rand -base64 32
```

3. **Initialize the database**:

```bash
npm run init-db
```

This will:
- Compile TypeScript → JavaScript (into `dist/`)
- Create the SQLite database (`data/vocab.db`)
- Migrate vocabulary from JSON files (if present)
- Prevent duplicates with a UNIQUE constraint

4. **Start the server**:

```bash
npm start
```

The app will be running at `http://localhost:3000`.

### Development Workflow

**Frontend Development (Vite)**:
```bash
npm run dev:frontend   # Starts Vite dev server on http://localhost:5173 (HMR, TS)
```

**Backend Development (TypeScript watch)**:
```bash
npm run dev:backend    # Watches backend sources and recompiles to dist/
```

**Combined Dev (parallel)**:
```bash
npm run dev           # Runs backend watch + Vite dev (uses concurrently)
```

**Production Build**:
```bash
npm run build         # Backend compile (tsc) + Vite build (frontend) + version injection
```

**Backend Only Build**:
```bash
npm run build:backend
```

**Frontend Only Build (Vite)**:
```bash
npm run build:frontend
```

**Code linting**:
```bash
npm run lint          # Show errors
npm run lint:fix      # Automatic fixes
```

**Follow logs** (in development):
```bash
npm start
# Logs appear colorized in the console
```

**Important notes**:
- Backend output lives in `dist/` (e.g. `dist/server.js`)
- Vite outputs frontend assets to `dist/public/` (HTML + `assets/` folder)
- Frontend source lives in `src/public` (HTML, CSS, TypeScript modules)
- Version placeholder `{{VERSION}}` is injected into `dist/public/index.html` during build
- No manual copy step needed; Vite handles bundling.

---

## Deployment on Render.com

### Step 1: Create a Render account

Go to [render.com](https://render.com) and create a free account.

### Step 2: Set environment variables

**Before deploying**, set the following environment variables in the Render dashboard:

- `ADMIN_API_KEY`: A secure, random string (e.g. generated with `openssl rand -hex 32` or `openssl rand -base64 32`)
- `NODE_ENV`: `production` (set automatically)
- `DB_PATH`: `/data/vocab.db` (to match the persistent disk mount path)

**Security note**: **Never** use the default API key from the `.env` file in production!

### Step 3: Create a Web Service

1. In the Render dashboard: **New** → **Web Service**
2. Connect your repository (GitHub/GitLab)
3. The configuration is automatically loaded from `render.yaml`:
   - Build Command: `npm install`
   - Start Command: `npm run deploy`
   - Region: Frankfurt (or desired region)

### Step 4: Add a persistent disk

**Important**: Without a disk, vocabulary will be lost on every deploy!

1. In the service dashboard: **Disks** → **Add Disk**
2. Name: `vocab-data`
3. Mount Path: `/data`
4. Size: 1 GB (free in the Free Tier)

### Step 5: Start deployment

Render will automatically run:
1. `npm install` (installs dependencies)
2. `npm run deploy`:
   - Compiles TypeScript → JavaScript
   - Runs `init-db.js` (creates DB, migrates data)
   - Starts `server.js`

The app will then be available at `https://your-app.onrender.com`.

### Deployment Monitoring

- **Health Check**: `/health` endpoint is checked every 30 seconds
- **Logs**: Viewable in the Render dashboard under **Logs** (JSON format)
- **Auto-Deploy**: On push to the `main` branch, redeploy is automatic

### Health Check

The app provides a health endpoint for Render's monitoring:

```
GET /health
Response: {"status": "ok", "timestamp": 1234567890}
```

## API Endpoints

### Health Check

**GET** `/health`

Checks if the server is running and the database is reachable.

**Response**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

**Status Codes**:
- `200 OK`: Server is ready
- `503 Service Unavailable`: Database error

---

### Retrieve vocabulary

**GET** `/api/vocab/:lesson`

Loads all vocabulary for a specific lesson.

**Parameters**:
- `lesson` (string): One of: `lesson01`, `lesson02`, `lesson03`, `lesson04`

**Example**:
```bash
curl https://your-app.onrender.com/api/vocab/lesson01
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "lesson": "lesson01",
    "de": "Hund",
    "en": "dog",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "lesson": "lesson01",
    "de": "Katze",
    "en": "cat",
    "created_at": "2024-01-15T10:31:00Z"
  }
]
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid lesson. Must be one of: lesson01, lesson02, lesson03, lesson04"
}
```

---

### Add vocabulary

**POST** `/api/vocab/:lesson`

Adds a new vocabulary entry to a lesson.

**Parameters**:
- `lesson` (string): Target lesson (`lesson01`, `lesson02`, `lesson03`, `lesson04`)

**Request Body**:
```json
{
  "de": "Katze",
  "en": "cat"
}
```

**Validation**:
- `de` and `en` are required fields
- Maximum length: 50 characters per field
- Duplicates are ignored (UNIQUE constraint)

**Example**:
```bash
curl -X POST https://your-app.onrender.com/api/vocab/lesson01 \
  -H "Content-Type: application/json" \
  -d '{"de": "Katze", "en": "cat"}'
```

**Response** (201 Created):
```json
{
  "success": true,
  "id": 32,
  "de": "Katze",
  "en": "cat"
}
```

**Error Responses**:

400 Bad Request (missing fields):
```json
{
  "error": "Both 'de' and 'en' are required"
}
```

400 Bad Request (too long):
```json
{
  "error": "Input too long. Max 50 characters."
}
```

**Rate Limiting**: Max. 100 requests / 15 minutes per IP

---

### Delete vocabulary (Admin-only)

**DELETE** `/api/admin/vocab/:id`

Permanently deletes a vocabulary entry from the database.

**Parameters**:
- `id` (integer): The ID of the vocabulary entry to delete

**Header**:
```
X-API-Key: your-secret-admin-key
```

**Example**:
```bash
curl -X DELETE https://your-app.onrender.com/api/admin/vocab/1 \
  -H "X-API-Key: your-secret-admin-key"
```

**Response** (200 OK):
```json
{
  "success": true,
  "deleted": 1
}
```

**Error Responses**:

401 Unauthorized (missing/invalid API key):
```json
{
  "error": "Unauthorized. Valid API key required."
}
```

404 Not Found (entry does not exist):
```json
{
  "error": "Vocabulary entry not found",
  "deleted": 0
}
```

**Security**: 
- Accessible only with a valid `ADMIN_API_KEY`
- Not usable from the frontend
- Rate limiting: 100 requests / 15 minutes

---

### Update vocabulary (Admin-only)

**PUT** `/api/admin/vocab/:id`

Updates an existing vocabulary entry in the database.

**Parameters**:
- `id` (integer): The ID of the vocabulary entry to update

**Header**:
```
X-API-Key: your-secret-admin-key
```

**Request Body**:
```json
{
  "de": "Hund",
  "en": "dog"
}
```

**Validation**:
- `de` and `en` are required fields
- Maximum length: 60 characters per field
- Fields must not be empty (after trimming)

**Example**:
```bash
curl -X PUT https://your-app.onrender.com/api/admin/vocab/1 \
  -H "X-API-Key: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"de": "Hund", "en": "dog"}'
```

**Response** (200 OK):
```json
{
  "success": true,
  "updated": 1
}
```

**Error Responses**:

400 Bad Request (missing/invalid fields):
```json
{
  "error": "Missing or invalid fields"
}
```

400 Bad Request (too long):
```json
{
  "error": "Fields may be at most 60 characters long"
}
```

401 Unauthorized (missing/invalid API key):
```json
{
  "error": "Unauthorized. Valid API key required."
}
```

404 Not Found (entry does not exist):
```json
{
  "error": "Vocabulary entry not found"
}
```

**Security**: 
- Accessible only with a valid `ADMIN_API_KEY`
- Not usable from the frontend
- Rate limiting: 100 requests / 15 minutes

## Project Structure

```
vocab-trainer/
├── server.ts                    # Express server (main entry point)
├── init-db.ts                   # Database initialization & migration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── eslint.config.js             # ESLint configuration (flat config)
├── render.yaml                  # Render.com configuration
├── .env                         # Environment variables (not in git)
├── src/
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces & types
│   ├── services/
│   │   └── db.service.ts        # Database service (singleton)
│   ├── middleware/
│   │   └── auth.middleware.ts   # API key authentication
│   ├── routes/
│   │   ├── vocab.routes.ts      # Vocabulary endpoints (GET, POST)
│   │   └── admin.routes.ts      # Admin endpoints (DELETE)
│   ├── utils/
│   │   └── logger.ts            # Winston logger configuration
│   └── public/
│       ├── script.ts            # Frontend TypeScript (source)
│       └── tsconfig.json        # Frontend-specific TS config
├── public/
│   ├── index.html               # HTML template (copied to dist/public)
│   └── style.css                # CSS stylesheet (copied to dist/public)
├── dist/                        # 🏗️ Compiled code (generated, not versioned)
│   ├── server.js                # Compiled backend server
│   ├── init-db.js               # Compiled DB init script
│   ├── src/                     # Compiled backend modules
│   │   ├── types/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── public/                  # Compiled frontend files
│       ├── main.js              # Compiled frontend bundle (esbuild)
│       ├── main.js.map          # Source map
│       ├── index.html           # HTML (copied)
│       └── style.css            # CSS (copied)
├── logs/                        # Log files (production only)
│   ├── error.log
│   └── combined.log
└── data/
    └── vocab.db                 # SQLite database (created)
```

## Technology Stack

### Backend
- **Language**: TypeScript 5.9.3 (ES2020 Module)
- **Framework**: Node.js + Express 4.18.2
- **Database**: SQLite3 5.1.7
- **Logging**: Winston 3.17.0+ (structured logs)
- **Code Quality**: ESLint with TypeScript rules, JSDoc documentation

### Security
- **CORS**: Cross-Origin Resource Sharing enabled
- **Rate Limiting**: 100 requests / 15 minutes per IP
- **API Key Auth**: Admin endpoints protected
- **Input Validation**: 50-character limit for vocabulary fields

### Frontend
- **Language**: TypeScript 5.9.3 (compiled to ES2020)
- **DOM API**: Canvas API for animations
- **Layout**: CSS Flexbox with responsive design
- **Interactivity**: Drag-and-drop with collision detection
- **Build**: Separate TypeScript compiler with DOM types
- **Debugging**: Source maps for browser DevTools

### Hosting
- Render.com with persistent disk (1GB)
- Automatic HTTPS redirection
- Health check endpoint
- Graceful shutdown

## Security

### API Key Authentication

Admin endpoints (DELETE) are protected by API key:

```bash
curl -X DELETE https://your-app.onrender.com/api/admin/vocab/1 \
  -H "X-API-Key: your-secret-admin-key"
```

**Best Practices**:
- Never use the API key in frontend code
- Rotate the API key regularly
- Generate strong, random keys (at least 32 characters)

### Rate Limiting

All API endpoints are rate-limited:
- **100 requests** per 15 minutes per IP address
- On exceeding: HTTP 429 (Too Many Requests)

### CORS Configuration

CORS is enabled, but should be restricted to specific origins in production:

```typescript
// In server.ts for production:
app.use(cors({
  origin: 'https://your-domain.com'
}));
```

### Input Validation

All vocabulary inputs are validated:
- Maximum length: 50 characters
- No empty strings allowed
- XSS protection via Content-Type header

## Troubleshooting

### Database Issues

**Problem**: Database is empty after deploy  
**Solution**: Check the logs in the Render dashboard. `init-db.ts` should run migration automatically. If not: is the persistent disk mounted correctly?

**Problem**: Duplicate entries  
**Solution**: The database has a UNIQUE constraint on `(lesson, de, en)`. Duplicates are automatically skipped with `INSERT OR IGNORE`.

**Problem**: "SQLITE_CANTOPEN" error  
**Solution**: 
1. Check if the `data/` directory exists
2. Check write permissions on the persistent disk
3. Mount path must be `/data`

### TypeScript/Build Issues

**Problem**: "Cannot find module" error  
**Solution**: 
```bash
rm -rf dist node_modules
npm install
npm run build
```

**Problem**: ESLint errors  
**Solution**: 
```bash
npm run lint:fix  # Automatic fixes
```

### Deployment Issues

**Problem**: Port error  
**Solution**: The server binds to `0.0.0.0:$PORT`. Render sets the `PORT` variable automatically. Do not hardcode!

**Problem**: Health check failed  
**Solution**: 
1. Check if the `/health` endpoint is reachable
2. Server must listen on `0.0.0.0` (not `localhost`)
3. Response must be JSON with status 200

**Problem**: "Module not found" in production  
**Solution**: Ensure all dependencies are in `dependencies` (not `devDependencies`). TypeScript is required at runtime.

### Data Persistence

**Problem**: Data is lost on redeploy  
**Solution**: Persistent disk must be configured correctly:
- Mount path: `/data`
- Disk name: `vocab-data`
- Defined correctly in `render.yaml`

**Problem**: Logs not visible  
**Solution**: 
- In development: logs appear in the console (colorized)
- In production: logs are written to `logs/` **and** shown in the Render dashboard

## Developer Notes

### Architecture

The project follows a **modular architecture** with clear separation of concerns:

- **Types**: Central TypeScript interfaces (`VocabEntry`, `ApiResponse`, `Lesson`)
- **Services**: Business logic (database service as singleton)
- **Middleware**: Request processing (API key validation)
- **Routes**: API endpoint handlers (vocabulary & admin)
- **Utils**: Utility functions (logger with structured logs)

**Advantages**:
- Testability (each module can be tested in isolation)
- Maintainability (clear responsibilities)
- Reusability (services can be used in multiple routes)

### Logging

**Winston logger** with environment-dependent format:

- **Development**: Colorized console output with timestamps
- **Production**: JSON format with file rotation (error.log + combined.log)

Structured log entries include:
- Timestamp
- Log level (info, warn, error)
- Service name
- Context data (lesson, vocabId, IP, etc.)

**Example**:
```
[09:34:10] info: Vocabulary added { service: 'DatabaseService', lesson: 'lesson01', de: 'Hund', en: 'dog', id: 15 }
```

### Database Schema

```sql
CREATE TABLE vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson TEXT NOT NULL,
  de TEXT NOT NULL,
  en TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson, de, en)
)
```

**Duplicate Prevention**: The UNIQUE constraint prevents identical entries per lesson.

### Code Quality

- **TypeScript**: Strict mode for type safety
- **ESLint**: Lint rules for TypeScript (0 errors, 1 acceptable warning)
- **JSDoc**: Complete API documentation in all modules
  - @module tags for module descriptions
  - @param/@returns for function signatures
  - @throws for error handling
  - @example for complex functions

### Graceful Shutdown

The server handles SIGINT and SIGTERM signals properly:
1. New connections are refused
2. Ongoing requests are completed
3. Database connection is cleanly closed
4. Process exits with code 0

### Animations

The app randomly selects one of 5 success animations:
- Confetti (4 seconds with automatic cleanup)
- Balloons (rising)
- Rocket (bottom to top)
- Unicorn (right to left)
- Fireworks (multiple explosions)

**Technical details**: Canvas API with `requestAnimationFrame()` and `clearRect()` for performance

## Testing

**Current status**: Tests are not yet implemented.

**Planned**:
- Unit tests for the database service (`db.service.ts`)
- Integration tests for API endpoints
- Middleware tests for authentication
- Frontend E2E tests (Playwright/Cypress)

**Test framework**: Jest + Supertest

---

## Contributing

### Code Standards

- **TypeScript**: All new files in TypeScript
- **ESLint**: Code must pass lint rules (`npm run lint`)
- **JSDoc**: Document public functions
- **Commit messages**: Use meaningful descriptions

### Workflow

1. Create a branch: `git checkout -b feature/my-feature`
2. Implement changes
3. Write tests (if applicable)
4. Lint check: `npm run lint`
5. Build check: `npm run build`
6. Commit & push
7. Create a pull request

---

## Roadmap

### High Priority
- [ ] Unit and integration tests (Jest)
- [ ] Enhanced health check with DB connectivity test

### Medium Priority
- [ ] Save lesson progress (LocalStorage)
- [ ] Export/import vocabulary (CSV)

### Low Priority
- [ ] Audio pronunciation (Text-to-Speech API)
- [ ] Spaced repetition algorithm
- [ ] Multiple-choice mode

---

## Security

This project implements several security measures:
- 🔐 **Helmet.js**: Security headers (CSP, XSS protection, etc.)
- 🔑 **API Key Authentication**: Admin routes protected with API key
- 🚦 **Rate Limiting**: 100 requests per 15 minutes per IP
- ✅ **Input Validation**: SQL injection prevention, string length limits
- 🔒 **HTTPS Enforcement**: Automatic redirect in production
- 🛡️ **Environment Validation**: Server won't start without required config

## License

MIT License

Copyright (c) 2025 MockThePlank

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Contact

If you have questions or issues, please open an issue in the repository.

---

**Last updated**: October 2025  
**Version**: 2.0.0 (TypeScript + Modular Architecture)
