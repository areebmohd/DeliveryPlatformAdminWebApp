# Zoro Admin Panel

A comprehensive, high-performance administrative dashboard built with React, TypeScript, and Vite. This application serves as the central management hub for the **Zoro Delivery Platform**, providing real-time insights and control over orders, deliveries, stores, products, and riders.


## 🚀 Key Features

- **Real-time Order Management**: Track and manage orders from placement to delivery.
- **Delivery & Return Tracking**: Monitor the status of all active deliveries and product returns in real-time.
- **Business & Store Management**: Detailed view and control over partner stores and their listings.
- **Product Catalog Control**: Manage product details, pricing, and availability across the platform.
- **Rider Management**: Oversight of delivery personnel, their statuses, and performance.
- **Financial Overview**: Integrated payment tracking and payout management.
- **System Notifications**: Manage and dispatch platform-wide or targeted notifications.
- **Media Management**: Centralized hub for managing product and store imagery.

  <img width="1920" height="1080" alt="adminwebapp" src="https://github.com/user-attachments/assets/22622eda-d3ab-4825-9b2d-98a87ffe10bb" />


## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS with modern CSS variables
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend Service**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime)
- **Routing**: [React Router 7](https://reactrouter.com/)

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd adminwebapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

Run the application in development mode:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## 📦 Available Scripts

- `npm run dev`: Starts the Vite development server with HMR.
- `npm run build`: Compiles TypeScript and builds the production-ready bundle.
- `npm run lint`: Runs ESLint to check for code quality and style issues.
- `npm run preview`: Previews the production build locally.

## 📂 Project Structure

```text
src/
├── components/   # Reusable UI components (Layout, Sidebar, etc.)
├── constants/    # Platform-wide constants and configurations
├── pages/        # Main route components (Dashboard, Orders, etc.)
├── services/     # API and Supabase service integrations
├── types/        # TypeScript interfaces and type definitions
├── utils/        # Helper functions and formatting utilities
├── assets/       # Static assets like images and global icons
└── App.tsx       # Root component and routing configuration
```

## 🛡️ Security

This application uses Supabase Row Level Security (RLS) and JWT-based authentication to ensure that administrative data is only accessible to authorized personnel.

---

Built with ❤️ for the Delivery Platform Ecosystem.
