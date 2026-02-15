# 📚 Shelf Scanner

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel&logoColor=white)](https://vercel.com)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Postgres-blue)](https://github.com/Hemachandiranpajany/AI_shelf_scanner)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-orange?logo=google-gemini&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent full-stack book discovery engine that transforms photos of your physical bookshelf into actionable digital insights and personalized recommendations.

---

## 🚀 Key Features

*   📷 **Neural Book Recognition**: Powered by Google Gemini 1.5 Flash for high-accuracy spine detection.
*   🧠 **Context-Aware Recommendations**: Phase-based AI generation that analyzes your shelf's "vibe" to suggest 5 new titles.
*   ⚡ **Serverless Optimized**: Custom image pipeline designed to run within Vercel's 10-second free tier budget.
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

## 🏗️ Architectural Excellence: The "10s Optimized" Suite

To handle heavy AI processing on Vercel's 10-second free tier, we implemented several engineering optimizations:

1.  **Client-Side Image Siphoning**: Images are automatically compressed to 1200px (JPEG 80%) in the browser before upload, reducing network latency by ~70%.
2.  **Phased Processing**:
    *   **Phase 1 (Detection)**: Rapid spine identification (3-5s).
    *   **Phase 2 (Background Recommendations)**: Triggered post-UI load to grant the AI a fresh 10s window.
3.  **Lazy Initialization**: Core services (DB Pool, Encryption, Gemini) initialize only when needed to minimize serverless cold-start overhead.

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

### User Endpoints
- `GET /api/user/profile` - JWT Protected profile data
- `PUT /api/user/preferences` - Update AI recommendation weights
- `GET /api/history` - Retrieve all past scan sessions

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
