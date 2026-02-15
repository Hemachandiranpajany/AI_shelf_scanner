# 📚 Shelf Scanner
**Don’t let great books slip through your fingers.**

Standing in front of shelves packed with books but unsure where to start? Whether you're at a sale, library, or visiting a friend, ShelfScanner helps you identify hidden gems using AI-powered recommendations tailored to your taste.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel&logoColor=white)](https://vercel.com)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Postgres-blue)](https://github.com/Hemachandiranpajany/AI_shelf_scanner)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-orange?logo=google-gemini&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Key Features

*   📷 **Neural Book Recognition**: Powered by Google Gemini 1.5 Flash for high-accuracy spine detection.
*   🧠 **Context-Aware Recommendations**: Phase-based AI generation that analyzes your shelf's "vibe" to suggest 5 new titles.
*   🖼️ **Metada Enrichment**: Automatic fetching of covers, ratings, and descriptions via Google Books API.
*   👤 **Hybrid Auth**: Anonymous instant scans for guests with optional JWT-based history for registered users.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Axios |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL (Neon/Vercel Postgres) |
| **AI/ML** | Google Gemini (Flash-Latest) |
| **Storage** | AES-256-GCM Encrypted Local State |
| **Hosting** | Vercel (Serverless Functions) |

---

## 🏗️ Project Architecture

```
ShelfScanner/
├── client/src/              # React frontend
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Shadcn/ui base components
│   │   ├── book-scanner/  # Book scanning interface
│   │   └── layout/        # Navigation and layout
│   ├── pages/             # Application routes/pages
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts (Theme, Device)
│   └── lib/               # Utilities and API clients
├── server/                # Express.js backend
│   ├── routes.ts          # Main API routes
│   ├── books.ts           # Book data services
│   ├── openai-*.ts        # AI integration services
│   ├── book-cache-service.ts # Caching layer
│   ├── storage.ts         # Database operations
│   └── middleware/        # Express middleware
├── shared/                # Shared TypeScript types
│   └── schema.ts          # Database schema definitions
├── api/                   # Vercel API routes
├── public/                # Static assets
├── tests/                 # Test files
└── scripts/               # Utility scripts
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL instance (Neon.tech recommended for dev)
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### Quick Start (Development)

1. **Clone & Install**
   ```bash
   git clone https://github.com/Hemachandiranpajany/AI_shelf_scanner.git
   cd AI_shelf_scanner
   npm run install-all  # Installs root, client, and server dependencies
   ```

2. **Environment Configuration**
   Create a `.env` in the `server` directory:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/db
   GEMINI_API_KEY=your_key_here
   JWT_SECRET=your_secret
   ENCRYPTION_KEY=32_character_hex_key
   ```

3. **Database Migration**
   ```bash
   psql [YOUR_DATABASE_URL] -f database/schema.sql
   ```

4. **Launch**
   ```bash
   npm run dev
   ```

---

## 📡 API Documentation

### Scan Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scan` | Upload image & trigger Phase 1 (Detection) |
| `GET` | `/api/scan/:id` | Poll session status & detected books |
| `GET` | `/api/scan/:id/recommendations` | Trigger Phase 2 (AI Analysis) |
| `POST` | `/api/scan/:id/feedback` | Submit corrections to the AI result |

---

## 🔒 Security & Performance
- **Data Privacy**: Images are processed in-memory and never stored permanently.
- **Rate Limiting**: Integrated brute-force protection for API endpoints.
- **Secure Handling**: AES-256-GCM encryption for all session-related metadata.

---

## 🤝 Contributing
Contributions are welcome! If you have suggestions for improving the AI prompts or UI performance, feel free to open a Pull Request.

---

## 📄 License
Project is licensed under the **MIT License**.

Built with ❤️ by [Hemachandiran](https://github.com/Hemachandiranpajany)

---

❌ **Commercial Use**: Commercial use is strictly prohibited  
❌ **Distribution**: You may not distribute, modify, or create derivative works  
❌ **Deployment**: You may not deploy this application for public or commercial use
