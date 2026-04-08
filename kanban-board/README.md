# NP Kanban Board

A modern, responsive Kanban board built with **React 19**, **Vite**, and **Supabase**. This project features a Sage Green themed UI with drag-and-drop functionality, task filtering, and secure user-based data persistence.

## Live Demo
(https://np-kanban-anmol-amdq2d5yz-anmolnemagoudas-projects.vercel.app/)

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Icons**: Lucide Reac
- **Drag & Drop**: @hello-pangea/dnd
- **Backend/Auth**: Supabase (PostgreSQL + GoTrue)

## Key Features
- **Anonymous Auth**: Users are automatically signed in anonymously to save their board state without a complex signup.
- **Drag-and-Drop**: Tasks can be moved between columns (To Do, In Progress, In Review, Done) with state persistence.
- **Task Management**: Detailed view for adding assignees and notes to individual tasks.
- **Filtering**: Real-time search and label filtering (Bug, Feature, Design).

## How to Run Locally
1. Clone the repository.
2. Run `npm install`.
3. Create a `src/supabaseConfig.ts` file with your credentials:
   ```typescript
   export const SUPABASE_CONFIG = {
     url: "YOUR_SUPABASE_URL",
     anonKey: "YOUR_SUPABASE_ANON_KEY"
   };