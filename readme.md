# Bonyan  🏠💰

> **A smart budget planning platform for home finishing and furnishing.**

Bonyan helps users organize their home finishing budget and discover products that fit their available funds — combining real-time budget tracking with smart, rule-based product recommendations, instead of just acting as a static product catalog.

---

## 📌 The Problem

Home finishing is one of the largest financial commitments a household makes. However, it is usually managed manually across dozens of independent suppliers with no continuous budget tracking. 

This commonly leads to:
* Overspending early on in the project.
* Running out of funds before critical finishing phases are completed.
* Disconnect between budgeting and product selection.

---

## 💡 What Bonyan Does

* **Budget Allocation** — Enter your total finishing budget and get it automatically split across key categories (electrical, plumbing, flooring, paints, kitchens, furniture, etc.) based on predefined rules.
* **Smart Product Filtering** — Browse products automatically filtered by your remaining budget, location, preferences, and current finishing phase.
* **Real-Time Budget Tracking** — Your remaining budget updates instantly after every purchase decision, triggering warnings before you exceed category or overall limits.
* **Reviews & Ratings** — Rate and review products and suppliers to help the community make informed decisions.

---

## 🎯 Target Users

### 🏠 B2C (End Users)
* Newly married couples preparing their homes.
* First-time homeowners.
* Families renovating their existing homes.

### 🏢 B2B (Suppliers & Vendors)
* Furniture manufacturers.
* Finishing material suppliers.
* Local workshops.
* Contractors and interior specialists.

---

## 🛠️ Tech Overview

The MVP is built as a rule-based system (without heavy ML) structured around four core backend modules:

1. **Budget Allocation Engine** — Converts total user budget into a customized category allocation matrix.
2. **Product Filtering & Discovery Engine** — Queries available products by project phase, location, and budget constraints.
3. **Overspend Warning System** — Sends real-time alerts as spending approaches category or total limits.
4. **Recommendation Engine** — Matches remaining budget against active product listings to surface the most relevant choices.

### Supporting Infrastructure
* **Role-Based Authentication (RBAC):** Distinct roles for Customers, Vendors, and Admins.
* **Input Validation Layer:** Ensures accurate data formatting across API calls.
* **Caching Layer (Redis):** Caches frequent queries for fast performance at scale.

---

## 🚀 Future Roadmap

Planned updates beyond the MVP release:

- [ ] Expansion into home decor, interior accessories, and appliances.
- [ ] Live market/price updates and automated price comparison.
- [ ] Data-driven personalization powered by user interaction history.
- [ ] Advanced AI-based recommendation engines across the entire platform.

---

## 🚧 Status

**In Active Development** — Building the MVP scope described above.
```text
bonyan/
├── backend/
│   ├── migrations/          # Database migration files
│   ├── src/                 # Application source code
│   │   ├── admin/           # Admin management endpoints & logic
│   │   ├── auth/            # Authentication & Role-Based Access Control
│   │   ├── budget/          # Budget Allocation Engine
│   │   ├── categories/      # Category management & rules
│   │   ├── listings/        # Product listings & supplier feeds
│   │   ├── products/        # Product Filtering & Discovery Engine
│   │   ├── purchases/       # Purchase tracking & transaction management
│   │   ├── recommendations/ # Rule-based Recommendation Engine
│   │   ├── shared/          # Shared utilities, constants, & middlewares
│   │   ├── stores/          # Vendor & store management
│   │   ├── users/           # Customer & user profile logic
│   │   └── index.ts         # Main API application entry point
│   ├── .env                 # Environment variables
│   ├── .gitignore           # Git ignore config
│   ├── package.json         # Node.js dependencies & scripts
│   ├── tsconfig.json        # TypeScript compiler options
│   └── readme.md            # Backend documentation
├── frontend/
│   ├── assets/              # Images, icons, and static assets
│   ├── css/                 # Stylesheets
│   ├── js/                  # Frontend scripts & logic
│   ├── lib/                 # Third-party libraries & dependencies
│   └── index.html           # Main frontend entry point
├── AI/
│   ├── data/                # Model's data
│   ├── .gitignore           # Git ignore config
│   ├── api.py               # Model's API 
│   ├── pipeline.py          # Pipeline for uploading documents
│   ├── requirements.txt     # Required packages for the model
|   └── Dockerfile           # Dockerfile for Railway deployment
└── readme.md                # Project main documentation
