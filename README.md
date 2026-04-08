# Inventory SaaS

A full-stack **inventory management SaaS** with a responsive admin UI, REST API backend, and an AI-powered insights dashboard built with Node.js, Express, React, TypeScript, and MongoDB.

## Features

- **Inventory Management** — Full CRUD with soft delete and stock tracking
- **Order Management** — Order creation with automatic stock reduction and status workflow (pending → confirmed → shipped → delivered / cancelled)
- **Authentication & Role-Based Access** — JWT auth with admin / manager permissions
- **AI-Powered Insights Dashboard** — Actionable insights from inventory and order data
- **Responsive Admin UI** — Modern React dashboard for operational workflows
- **REST API Backend** — Express + TypeScript API for auth, products, orders, dashboard, and AI insights
- **Dashboard Analytics** — Revenue stats, top products, and order trends with interactive charts
- **Input Validation** — Zod schema validation on all endpoints
- **Security** — Helmet headers, bcrypt password hashing, CORS configuration

## AI Insights

The admin dashboard includes an AI-powered insights feature that analyzes inventory and order data to generate concise, actionable recommendations for operations teams.

### Features

- Business summary of inventory and sales
- Detection of low-stock and out-of-stock risks
- Opportunities based on product performance
- Actionable recommendations for restocking and optimization

### Technical Highlights

- OpenAI API integration
- Fallback mode when AI is unavailable
- 5-minute backend caching
- `generatedAt` timestamp support
- Admin-only protected access
- Tested with Vitest and Supertest

### Example Output

```json
{
  "summary": "Inventory is stable overall, with a few products requiring immediate replenishment.",
  "risks": ["3 products are out of stock", "6 products are low on stock"],
  "opportunities": ["Top-selling category shows strong weekly demand momentum"],
  "actions": [
    "Reorder out-of-stock SKUs today",
    "Increase safety stock for fast-moving items",
    "Review weekly reorder thresholds by category"
  ]
}
```

## Tech Stack

| Layer    | Technologies                                        |
|----------|-----------------------------------------------------|
| Backend  | Node.js, Express, TypeScript, MongoDB (Mongoose)    |
| Frontend | React 19, TypeScript, React Router v7, Vite         |
| Auth     | JWT, bcryptjs                                       |
| Charts   | Recharts                                            |
| Validation | Zod                                               |

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Docker** + **Docker Compose** (for local replica set setup with transactions)

### Installation

```bash
# Clone the repository
git clone https://github.com/ardidrizi/inventory-saas.git
cd inventory-saas

# Install all dependencies (backend + frontend)
npm run install:all
```

### Environment Setup

```bash
# Copy the example env file and edit as needed
cp .env.example .env
```

| Variable     | Description                  | Default                                    |
|--------------|------------------------------|--------------------------------------------|
| `PORT`       | Backend server port          | `4000`                                     |
| `MONGO_URI`  | MongoDB connection string    | `mongodb://localhost:27018/inventory?replicaSet=rs0`  |
| `JWT_SECRET` | Secret key for JWT signing   | *(set your own)*                            |

### Running MongoDB with Docker Compose (Replica Set for Transactions)

```bash
docker compose up -d mongo mongo-init
```

This starts:
- `mongo` as a single-node replica set (`rs0`) on host port `27018` (to avoid local `27017` conflicts)
- `mongo-init` that initializes/reconfigures the replica set member as `localhost:27018`

After startup:
- MongoDB: `mongodb://localhost:27018/inventory?replicaSet=rs0`
- Order creation works locally with MongoDB transactions enabled from a locally running backend.

### Running the App

```bash
# Start the backend (port 4000)
npm run dev:backend

# Start the frontend (port 5173)
npm run dev:frontend
```

### Seed Demo Data

Populate the database with sample users, products, and orders:

```bash
npm run dev:backend   # make sure backend is not already running
cd backend && npm run seed
```

**Demo accounts:**

| Email               | Password   | Role    |
|---------------------|------------|---------|
| admin@demo.com      | demo123    | Admin   |
| manager@demo.com    | demo123    | Manager |

## API Endpoints

### Auth
| Method | Endpoint             | Description        | Auth |
|--------|----------------------|--------------------|------|
| POST   | `/api/auth/register` | Register a user    | No   |
| POST   | `/api/auth/login`    | Login              | No   |
| GET    | `/api/auth/me`       | Get current user   | Yes  |

### Products
| Method | Endpoint              | Description         | Auth       |
|--------|-----------------------|---------------------|------------|
| GET    | `/api/products`       | List all products   | Yes        |
| GET    | `/api/products/:id`   | Get product details | Yes        |
| POST   | `/api/products`       | Create product      | Admin only |
| PUT    | `/api/products/:id`   | Update product      | Admin only |
| DELETE | `/api/products/:id`   | Soft delete product | Admin only |

### Orders
| Method | Endpoint                   | Description      | Auth       |
|--------|----------------------------|------------------|------------|
| GET    | `/api/orders`              | List all orders  | Yes        |
| GET    | `/api/orders/:id`          | Get order details| Yes        |
| POST   | `/api/orders`              | Create order     | Yes        |
| PATCH  | `/api/orders/:id/status`   | Update status    | Admin only |

### Dashboard
| Method | Endpoint          | Description          | Auth |
|--------|-------------------|----------------------|------|
| GET    | `/api/dashboard`  | Get analytics data   | Yes  |

## Project Structure

```
inventory-saas/
├── backend/
│   └── src/
│       ├── controllers/    # Request/response handling
│       ├── services/       # Business logic
│       ├── models/         # Mongoose schemas
│       ├── middleware/     # Auth & validation middleware
│       ├── routes/         # Route definitions
│       ├── validators/     # Zod schemas
│       ├── app.ts          # Express configuration
│       ├── server.ts       # Entry point
│       └── seed.ts         # Database seeder
├── frontend/
│   └── src/
│       ├── api/            # Axios API clients
│       ├── components/     # Shared UI components
│       ├── context/        # React context (auth)
│       ├── pages/          # Page components
│       └── types/          # TypeScript definitions
├── .env.example
└── package.json            # Root scripts
```

## Scripts

| Command              | Description                        |
|----------------------|------------------------------------|
| `npm run dev:backend`  | Start backend in dev mode        |
| `npm run dev:frontend` | Start frontend in dev mode       |
| `npm run build:backend`| Build backend for production     |
| `npm run build:frontend`| Build frontend for production   |
| `npm run install:all`  | Install all dependencies         |
