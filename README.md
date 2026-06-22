# 🏏 Gully Cricket App

A modern, ultra-premium web application for live cricket scoring, match tracking, and tournament management. Designed with a sleek, minimalist "Lineguru" aesthetic, this app provides real-time updates and seamless team management.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)
![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=flat&logo=firebase)

---

## ✨ Features

- **🔴 Live Scoring Dashboard:** Track match progress in real-time with instant updates.
- **📱 PWA Ready:** Installable on mobile devices as a Progressive Web App for a native-like experience.
- **🎨 Premium UI/UX:** Ultra-modern, flat design using Tailwind CSS v4, featuring a pristine white canvas with crisp data visualizations.
- **🔗 1-Click Live Sharing:** Instantly share the live match URL to any native social media or messaging platform using the Web Share API.
- **📊 Interactive Data Visualization:** Clean graphs and charts built with Recharts to visualize run rates and player stats.
- **💬 Live Match Chat:** Real-time integrated chat for viewers built on Firebase Realtime Database.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Database:** [Firebase Realtime Database](https://firebase.google.com/docs/database) (via `firebase` and `firebase-admin`)
- **Icons & Visuals:** [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/)

## 🏗️ Architecture Details

The application is built using a modern decoupled architecture optimized for real-time performance:
- **Frontend Layer:** Next.js Server Components and Client Components are used strategically. Client components (`"use client"`) handle interactive states (live scores, charts, chat) while Server components fetch initial generic data to ensure fast TTFB (Time to First Byte).
- **State Management:** Global app state (like theme or user preferences) is managed via `Zustand`, while localized real-time data syncs directly from Firebase via hooks (`onValue`).
- **Data Flow:** The admin/scorer updates the match state, which writes to the Firebase Realtime Database. Firebase instantly pushes these JSON tree updates to all connected client listeners, ensuring sub-second score updates globally.
- **Styling Paradigm:** Tailwind CSS is used strictly via utility classes without external CSS files. The UI follows a strict design token system for colors (e.g., `#F4F4F5` for backgrounds, `indigo-900` for primary text) to maintain the signature "Lineguru" aesthetic.

## 🚀 Getting Started

### Prerequisites
Make sure you have **Node.js** (v18+) and **npm/yarn** installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gully-cricket-app.git
   cd gully-cricket-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase Environment Variables**
   Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_realtime_database_url

   # Firebase Admin Variables (For server-side API routes)
   FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email
   FIREBASE_PRIVATE_KEY="your_firebase_private_key"
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to view the app!

## 🤝 Contribution Guidelines

We welcome contributions from the community to make Gully Cricket even better!

1. **Fork the Repository:** Start by forking the main repository to your GitHub account.
2. **Create a Feature Branch:** `git checkout -b feature/your-feature-name`
3. **Follow the Style Guide:** 
   - Ensure you use Tailwind classes for styling (avoid writing custom CSS).
   - Maintain the existing minimalist design language.
   - Run `npm run lint` to ensure ESLint passes without errors before committing.
4. **Commit Changes:** Use conventional commits (e.g., `feat: added player stats graph`, `fix: header alignment`).
5. **Open a Pull Request:** Submit your PR against the `main` branch with a clear description of your changes and screenshots if it alters the UI.

## 🌍 Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/).

1. Push your code to a GitHub repository.
2. Import the repository in your Vercel dashboard.
3. Ensure you add all your `.env.local` variables into the Vercel Environment Variables settings.
4. Click **Deploy**.

*You can also trigger a production deployment locally via Vercel CLI:*
```bash
npx vercel --prod
```

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
