# JEETO Project Structure

## Frontend (Vite + React + TypeScript)
- `/src`
  - `/components`: Reusable UI components (Cards, Buttons, MathRenderer, etc.)
    - `/layout`: Shell, Navigation, Sidebar
    - `/practice`: QuestionCard, Timer, OptionSelector
    - `/dashboard`: StatsCards, TopicList
  - `/hooks`: Custom React hooks (useAuth, usePractice, useAnalytics)
  - `/lib`: Third-party library initializations (supabaseClient.ts, katex.ts)
  - `/pages`: Main view components (Home, Practice, Analytics, Login)
  - `/services`: API and DB interaction logic (geminiService.ts, dbService.ts)
  - `/types`: TypeScript interfaces and Enums (database.types.ts)
  - `/utils`: Helper functions (formatting, calculations)

## Backend (Express - for LLM Proxying)
- `/server.ts`: Express server entry point
- `/api`: Server-side routes for Gemini API calls (to keep keys secure if needed, though Gemini is called from frontend here as per guidelines)

## Database
- `/supabase_schema.sql`: PostgreSQL schema for Supabase
