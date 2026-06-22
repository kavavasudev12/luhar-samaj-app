# Luhar Samaj Management System (LGS-SK)

Welcome to the **Luhar Samaj Management System** — a premium, enterprise-grade MERN stack application customized for the administration, member directory tracking, identity card generation, and audit logging of the Samast Luhar Samaj Savarkundla community.

---

## 🚀 Key Features

1. **Analytical Dashboard**:
   - 6 dynamic card indicators (Total Members, Family Members, Adult Members, Zones, Pending Requests, and Deleted Members).
   - 4 responsive visualization charts (Male/Female gender distributions, Zone population layout, Age bucket distributions, and monthly registration growth metrics).
   - Live activity feed showing the 5 most recent audit logs.

2. **Directory & Multi-Step Forms**:
   - Clean, validated 3-step member entry/edit form with material design aesthetics.
   - Mobile-first camera capture capability (`capture="environment"`) and file picker uploads for Ration Card photos.
   - Separate **Adult Members Directory** (`/members/adults`) filtering members and family units where age $\ge 18$ with search, sort, pagination, and Excel export support.

3. **Google Drive Integration**:
   - Google Drive cloud storage for ration card images, automatically categorized into custom folder pathways (`RationCards/ZoneX`).
   - Secure backend proxy routes (`preview`, `download`, `delete`) to stream assets without exposing private access tokens.
   - Robust upload fail-safe logic ensuring database records are saved even if Drive credentials are missing or connection fails.

4. **Security Hardening**:
   - Rate limiting, Helmet security headers, MongoDB query sanitization, and recursion-based XSS sanitization middleware.
   - Role-Based Access Control (RBAC) with secure cookie parsing.

---

## 🛠️ Project Structure

```
luhar-samaj-app/
├── backend/                  # Express REST API & Database Services
│   ├── config/               # Database and authentication configs
│   ├── middleware/           # Security and auth middleware
│   ├── models/               # MongoDB Schemas (Mongoose)
│   ├── routes/               # API endpoints
│   ├── services/             # Google Drive and PDF generation services
│   └── tests/                # Jest & Supertest endpoint tests
├── frontend/                 # React Single Page Application (SPA)
│   ├── src/
│   │   ├── components/       # Custom stepper form, image modals, layouts
│   │   ├── pages/            # Dashboard, Members, Adults Directory, Settings
│   │   └── services/         # API abstraction layer
└── docker-compose.yml        # Multi-container local orchestration config
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+ & npm
- MongoDB local instance or MongoDB Atlas Connection string
- *(Optional)* Google Cloud Platform service account JSON credentials with Google Drive API enabled.

### Local Setup

1. **Clone and Setup Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and supply your MONGODB_URI and JWT_SECRET
   npm install
   npm run dev
   ```
2. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

### Running with Docker (Recommended)
Launch the entire stack (MongoDB, Backend REST API, and Nginx-based React SPA) with a single command:
```bash
docker-compose up --build
```
The app will be accessible at:
- Frontend Client: `http://localhost:3000`
- Backend API Endpoint: `http://localhost:5000`

---

## 🧪 Testing

### Running Backend Tests
Execute Jest API integration test suite containing mocks for the database and GCP services:
```bash
cd backend
npm test
```

### Running Frontend Tests
Execute Jest/React Testing Library component tests:
```bash
cd frontend
npm test -- --watchAll=false
```

---

## 📖 REST API Reference (Swagger-style Specifications)

All API requests are prefixed with `/api`. Protected routes require authentication via header: `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| **POST** | `/auth/register` | Register a new administrator user. | Yes (Admin) |
| **POST** | `/auth/login` | Log in and receive JWT token. | No |

### Member Management Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| **GET** | `/members` | List all active member families. | Yes |
| **GET** | `/members/deleted` | List all soft-deleted members. | Yes |
| **GET** | `/members/adults` | List all members $\ge 18$ years old with pagination. | Yes |
| **POST** | `/members` | Create a new member family. | Yes |
| **PUT** | `/members/:id` | Update member data using partial `$set` operations. | Yes |
| **DELETE** | `/members/:id` | Soft-delete a member. | Yes |

### Ration Card File Proxy Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| **POST** | `/members/:id/ration-card` | Upload or capture camera photo of ration card to Google Drive. | Yes |
| **GET** | `/members/:id/ration-card/preview` | Stream proxy stream preview of ration card from Drive. | Yes |
| **GET** | `/members/:id/ration-card/download` | Securely proxy download of raw file attachments. | Yes |
| **DELETE** | `/members/:id/ration-card` | Remove file link and delete it from Google Drive storage. | Yes |

### Analytic Dashboard & Reports
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| **GET** | `/dashboard` | Fetch analytical indicators, growth, age and zone distribution data. | Yes |
| **GET** | `/export/members` | Download standard Excel sheet of all active members. | Yes |
| **GET** | `/export/deleted` | Download Excel sheet containing soft-deleted members. | Yes |
| **GET** | `/export/adults` | Download Excel sheet containing all adult members. | Yes |
| **GET** | `/audit` | Retrieve paginated system action logs. | Yes |
