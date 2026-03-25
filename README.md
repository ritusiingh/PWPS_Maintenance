# \ud83c\udfe0 Apartment Maintenance Calculator

> Transparent maintenance calculation tool for a 328-unit residential society in Bangalore, India.  
> Compares **three calculation methods** \u2014 Sq Ft, UDS, and Hybrid \u2014 so every resident can understand and agree on the fairest approach.

---

## Features

### Core Calculation Engine
- **Sq Ft Based**: Charges proportional to each flat's super built-up area
- **UDS Based**: Charges proportional to Undivided Share of land
- **Hybrid**: Balanced mix \u2014 40% equal share + 30% Sq Ft + 30% UDS
- Side-by-side comparison for every flat across all 3 methods
- Per-service breakdown showing exactly how each charge is split

### Modules
| Module | Description |
|--------|-------------|
| **Dashboard** | Collection stats, BHK comparisons, method analytics, payment status pie charts, trends |
| **Units** | Manage 328 flats \u2014 flat number, owner, carpet/super built-up/UDS area, BHK type |
| **Maintenance** | Live 3-way comparison, service charges management, bill generation |
| **Payments** | Record offline payments (UPI/NEFT/cheque/cash), download PDF invoices |
| **Reports** | Expense tracking, collection vs billing trends, category-wise expense breakdowns |
| **Settings** | User management (RBAC), service charge config, hybrid weight tuning |

### Other Capabilities
- **Role-Based Access**: Admin, Resident, Viewer roles
- **PDF Invoices**: Download per-flat invoices with full breakdown
- **Email Notifications**: Automated reminders for pending payments
- **Expense Tracking**: Log society expenses with vendor details
- **Responsive UI**: Works on desktop, tablet, and mobile
- **800+ user capacity**: SQLite with WAL mode, rate-limited API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) with WAL mode |
| Auth | JWT (JSON Web Tokens), bcrypt |
| PDF | PDFKit |
| Email | Nodemailer |
| Deploy | Docker, Nginx, systemd |

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js 20+** (https://nodejs.org)
- **npm 9+**
- **VS Code** (recommended)

### Step 1: Clone / Extract the project
```bash
cd apartment-maintenance
```

### Step 2: Install all dependencies
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### Step 3: Seed the database
```bash
node scripts/seed.js
```
This creates:
- 328 real flats across 9 blocks (A-I) from PWPS floor plans
- 10 service charges (Security, Housekeeping, Electricity, etc.)
- Admin user: `admin@apartment.com` / `admin123`
- 10 demo resident users

### Step 4: Start development servers
```bash
npm run dev
```
This starts:
- Backend API on `http://localhost:5000`
- Frontend dev server on `http://localhost:5173` (with proxy to API)

### Step 5: Open in browser
Navigate to **http://localhost:5173** and login with:
- **Admin**: `admin@apartment.com` / `admin123`

---

## Project Structure

```
apartment-maintenance/
\u251c\u2500\u2500 server/                  # Backend
\u2502   \u251c\u2500\u2500 index.js             # Express entry point
\u2502   \u251c\u2500\u2500 models/
\u2502   \u2502   \u2514\u2500\u2500 database.js      # SQLite schema & init
\u2502   \u251c\u2500\u2500 middleware/
\u2502   \u2502   \u2514\u2500\u2500 auth.js          # JWT auth middleware
\u2502   \u251c\u2500\u2500 routes/
\u2502   \u2502   \u251c\u2500\u2500 auth.js          # Login, register, user management
\u2502   \u2502   \u251c\u2500\u2500 flats.js         # Flat/unit CRUD
\u2502   \u2502   \u251c\u2500\u2500 charges.js       # Service charges CRUD
\u2502   \u2502   \u251c\u2500\u2500 billing.js       # Calculate, generate bills, invoices
\u2502   \u2502   \u251c\u2500\u2500 payments.js      # Record & manage payments
\u2502   \u2502   \u2514\u2500\u2500 dashboard.js     # Analytics, expenses, settings
\u2502   \u2514\u2500\u2500 utils/
\u2502       \u251c\u2500\u2500 calculator.js    # 3-method calculation engine
\u2502       \u251c\u2500\u2500 email.js         # Nodemailer + HTML templates
\u2502       \u2514\u2500\u2500 invoice.js       # PDF invoice generation
\u251c\u2500\u2500 client/                  # Frontend (React + Vite)
\u2502   \u251c\u2500\u2500 src/
\u2502   \u2502   \u251c\u2500\u2500 App.jsx          # Router setup
\u2502   \u2502   \u251c\u2500\u2500 context/
\u2502   \u2502   \u2502   \u2514\u2500\u2500 AuthContext.jsx
\u2502   \u2502   \u251c\u2500\u2500 components/
\u2502   \u2502   \u2502   \u2514\u2500\u2500 Layout.jsx   # Sidebar + header
\u2502   \u2502   \u251c\u2500\u2500 pages/
\u2502   \u2502   \u2502   \u251c\u2500\u2500 Login.jsx
\u2502   \u2502   \u2502   \u251c\u2500\u2500 Dashboard.jsx
\u2502   \u2502   \u2502   \u251c\u2500\u2500 Units.jsx
\u2502   \u2502   \u2502   \u251c\u2500\u2500 MaintenanceCalc.jsx
\u2502   \u2502   \u2502   \u251c\u2500\u2500 Payments.jsx
\u2502   \u2502   \u2502   \u251c\u2500\u2500 Reports.jsx
\u2502   \u2502   \u2502   \u2514\u2500\u2500 Settings.jsx
\u2502   \u2502   \u2514\u2500\u2500 utils/
\u2502   \u2502       \u251c\u2500\u2500 api.js       # Axios instance
\u2502   \u2502       \u2514\u2500\u2500 helpers.js   # Formatters
\u2502   \u251c\u2500\u2500 index.html
\u2502   \u251c\u2500\u2500 vite.config.js
\u2502   \u2514\u2500\u2500 tailwind.config.js
\u251c\u2500\u2500 scripts/
\u2502   \u2514\u2500\u2500 seed.js              # Database seeder (328 flats)
\u251c\u2500\u2500 deploy/
\u2502   \u251c\u2500\u2500 oci-deploy.sh        # OCI deployment script
\u2502   \u2514\u2500\u2500 nginx.conf           # Nginx config template
\u251c\u2500\u2500 Dockerfile
\u251c\u2500\u2500 docker-compose.yml
\u251c\u2500\u2500 .env                     # Environment variables
\u2514\u2500\u2500 package.json
```

---

## Calculation Methods Explained

### 1. Sq Ft Based
Each flat pays proportionally based on its super built-up area.

```
Flat's Share = (Flat Super Built-up Area / Total Super Built-up Area) \u00d7 Service Cost
```

**Example**: If total area is 500,000 sq.ft and your flat is 1,500 sq.ft:
- Your ratio = 1500 / 500000 = 0.3%
- Security (\u20b92,80,000/month) \u2192 Your share = \u20b9840

### 2. UDS Based
Each flat pays based on its Undivided Share of land.

```
Flat's Share = (Flat UDS / Total UDS) \u00d7 Service Cost
```

### 3. Hybrid (Recommended)
Balanced approach combining all three components:

```
Flat's Share = 40% \u00d7 (Total Cost / Number of Flats)     \u2190 Equal portion
             + 30% \u00d7 (Flat Sq Ft / Total Sq Ft) \u00d7 Cost  \u2190 Area portion
             + 30% \u00d7 (Flat UDS / Total UDS) \u00d7 Cost       \u2190 UDS portion
```

The 40/30/30 split is configurable in Settings.

---

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | \u2014 | Login |
| POST | `/api/auth/register` | Admin | Create user |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/auth/users` | Admin | List all users |
| PUT | `/api/auth/users/:id` | Admin | Update user |

### Flats
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/flats` | Yes | List flats (filterable) |
| GET | `/api/flats/stats` | Yes | BHK/block statistics |
| POST | `/api/flats` | Admin | Add flat |
| POST | `/api/flats/bulk` | Admin | Bulk import |
| PUT | `/api/flats/:id` | Admin | Update flat |
| DELETE | `/api/flats/:id` | Admin | Delete flat |

### Charges & Calculation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/charges` | Yes | List service charges |
| POST | `/api/charges` | Admin | Add charge |
| GET | `/api/calculate` | Yes | Calculate all 3 methods |
| POST | `/api/calculate/generate-bills` | Admin | Generate monthly bills |

### Billing & Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bills` | Yes | List bills |
| GET | `/api/bills/:id/invoice` | Yes | Download PDF invoice |
| POST | `/api/bills/send-reminders` | Admin | Email reminders |
| GET | `/api/payments` | Yes | List payments |
| POST | `/api/payments` | Admin | Record payment |

### Dashboard & Reports
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/summary` | Yes | Dashboard analytics |
| GET/POST | `/api/dashboard/expenses` | Yes/Admin | Expenses |
| GET/PUT | `/api/settings` | Yes/Admin | App settings |

---

## OCI Deployment Guide

### Option A: Direct Deployment (Recommended)

1. **Create OCI Compute Instance**
   - Shape: VM.Standard.E2.1.Micro (free tier) or higher
   - OS: Ubuntu 22.04
   - Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS) in Security List

2. **SSH into the instance**
   ```bash
   ssh -i your-key.pem ubuntu@<public-ip>
   ```

3. **Upload the project**
   ```bash
   scp -i your-key.pem -r apartment-maintenance/ ubuntu@<public-ip>:~/
   ```

4. **Run the deployment script**
   ```bash
   cd apartment-maintenance
   chmod +x deploy/oci-deploy.sh
   ./deploy/oci-deploy.sh
   ```

5. **Configure email** (optional)
   ```bash
   nano .env
   # Set SMTP_HOST, SMTP_USER, SMTP_PASS
   sudo systemctl restart apartment-maintenance
   ```

6. **Setup SSL** (if you have a domain)
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

### Option B: Docker Deployment

1. **Install Docker on OCI instance**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. **Upload project and run**
   ```bash
   cd apartment-maintenance
   docker-compose up -d --build
   ```

### Management Commands
```bash
# Check status
sudo systemctl status apartment-maintenance

# View logs
sudo journalctl -u apartment-maintenance -f

# Restart
sudo systemctl restart apartment-maintenance

# Re-seed database (\u26a0\ufe0f deletes existing data)
cd /opt/apartment-maintenance && node scripts/seed.js
```

---

## Email Configuration

For Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account \u2192 Security \u2192 App Passwords
3. Update `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM=maintenance@yourapartment.com
   ```

---

## Customization

### Change Hybrid Weights
Go to Settings \u2192 Configuration \u2192 Hybrid Method Weights. Default is 40/30/30.

### Add New Service Charges
Go to Maintenance \u2192 "Add Charge" button, or Settings \u2192 Service Charges.

### Bulk Import Flats
Use the API endpoint `POST /api/flats/bulk` with a JSON array:
```json
{
  "flats": [
    {
      "flat_number": "A-101",
      "block": "A",
      "floor": 1,
      "bhk_type": "2BHK",
      "carpet_area_sqft": 1050,
      "super_buildup_sqft": 1365,
      "uds_area_sqft": 480,
      "owner_name": "John Doe",
      "owner_email": "john@email.com"
    }
  ]
}
```

---

## Security Notes

- Change `JWT_SECRET` in `.env` for production
- Change the default admin password immediately after first login
- Use HTTPS in production (Let's Encrypt / certbot)
- Rate limiting is enabled (500 requests per 15 minutes per IP)
- Passwords are hashed with bcrypt (10 rounds)

---

## License

Built for internal use by your residential society. Modify freely for your needs.
