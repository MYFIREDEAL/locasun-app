# Copilot Instructions for Locasun Supabase App

## Overview
React + Vite + Tailwind CSS + **Supabase** application for energy project management (solar, ACC, autonomy). Dual-user system: **Admins** (pipeline/CRM) and **Clients** (project tracking). Real-time sync with Supabase for prospects, appointments, and chat.

## Architecture

### **Critical: Dual-User System**
- **Admin Users** (`auth.users` + `public.users`): Access `/admin/*` routes (Pipeline, Agenda, Contacts, Charly AI, Profile)
  - Roles: `Global Admin`, `Manager`, `Commercial` (hierarchical permissions via RLS)
  - Stored in `public.users` with `user_id` linking to `auth.users`
- **Client Users** (`auth.users` + `public.prospects`): Access `/dashboard/*` routes (Project Dashboard, Parrainage, Profile)
  - Stored in `public.prospects` with `user_id` linking to `auth.users`
  - Can only see their own data (RLS enforced)

**Authentication Flow**: Check `supabase/AUTH_LOGIC.md` for complete login/signup logic. Always distinguish user type on auth by querying both `users` and `prospects` tables.

### **Directory Structure**
- **src/hooks/**: Custom Supabase hooks are the **data access layer**
  - `useSupabaseProspects.js`: CRUD + real-time for prospects
  - `useSupabaseAgenda.js`: CRUD + real-time for appointments/calls/tasks
  - `useSupabaseUser.js`: Get current authenticated user's UUID
  - `useSupabaseUsers.js`: List all admin users (for assignment/filtering)
  - **Pattern**: Hooks handle data transformation between Supabase snake_case and app camelCase (e.g., `start_time` ↔ `start`)
- **src/lib/supabase.js**: Supabase client initialization (requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`)
- **src/components/**: Role-separated (`admin/`, `client/`, shared)
- **src/pages/**: Route components split by `admin/` and `client/` folders
- **src/layouts/**: `AdminLayout.jsx` and `ClientLayout.jsx` wrap respective routes
- **supabase/**: **Critical documentation** - read before modifying database
  - `schema.sql`: Full database schema with RLS policies
  - `AUTH_LOGIC.md`: Admin vs Client authentication architecture
  - `DYNAMIC_FORMS_SYSTEM.md`: Form creation/submission via chat
  - `PROMPTS_AND_AUTOMATION.md`: Charly AI automation system
  - `ACCESS_CONTROL_SYSTEM.md`: Granular user access rights
  - `APPOINTMENT_RESCHEDULING.md`: Drag-and-drop appointment system

## Developer Workflows
- **Start dev**: `npm run dev` (requires `.env` with Supabase keys)
- **Build**: `npm run build`
- **Deploy**: `npm run deploy` (GitHub Pages via `gh-pages`)
- **Database**: Execute SQL scripts in Supabase Dashboard SQL Editor (see `supabase/DEPLOYMENT_GUIDE.md`)

## Critical Patterns

### **Data Transformation (Supabase ↔ App)**
Always transform between Supabase snake_case and app camelCase in hooks:
```javascript
// Supabase → App
const transformed = data.map(apt => ({
  id: apt.id,
  start: apt.start_time,  // NOT startTime
  end: apt.end_time,      // NOT endTime
  contactId: apt.contact_id
}))

// App → Supabase
const dbUpdates = {
  start_time: updates.startTime,
  end_time: updates.endTime,
  contact_id: updates.contactId
}
```

### **Real-Time Subscriptions**
All Supabase hooks use real-time channels. Pattern in `useSupabaseProspects.js`:
```javascript
const channel = supabase
  .channel('prospects-changes')
  .on('postgres_changes', { event: '*', table: 'prospects' }, (payload) => {
    // Handle INSERT/UPDATE/DELETE
  })
  .subscribe()

return () => supabase.removeChannel(channel)
```

### **Authentication & RLS**
- Always use `supabase.auth.getUser()` to get authenticated user
- Query `public.users` table to get user's role and permissions
- RLS policies filter data automatically - **never bypass with service role key in frontend**
- Example: Commercial users only see prospects where `owner_id = auth.uid()` or managed team members

### **State Management**
- **No Redux/Zustand**: Global state in `App.jsx` via `AppContext` (legacy localStorage migration in progress)
- **Supabase hooks are source of truth** for prospects/appointments/tasks
- `App.jsx` maintains complex state (projectStepsStatus, chatMessages, notifications) - gradually migrating to Supabase

### **Project-Specific Concepts**
- **Projects/Tags**: Each prospect has multiple project types (`ACC`, `Centrale`, `Investissement`, etc.) stored in `tags` array
- **Pipeline Steps**: Dynamic per-project steps stored in `project_steps_status` table
- **Chat System**: Messages linked to `prospect_id` + `project_type`, supports form submissions
- **Forms**: Admins create dynamic forms, send via chat, clients fill them, admins approve/reject (`client_form_panels` table)
- **Charly AI**: Automation system (prompts) that triggers actions based on project step completion

## Integration Points
- **Supabase**: All data persistence and real-time sync (see `supabase/README.md`)
- **Radix UI**: All `ui/` components use Radix primitives (`@radix-ui/react-*`)
- **@dnd-kit**: Drag-and-drop for pipeline cards and appointment rescheduling
- **date-fns**: Date manipulation (appointments, tasks)
- **Vite Plugins**: Custom iframe route restoration and visual editor (in `plugins/`)

## Common Pitfalls
- **Don't mix localStorage and Supabase**: Check if feature uses Supabase hooks before adding localStorage logic
- **UUID validation**: Ensure `contact_id`/`owner_id` are valid UUIDs before inserting (Supabase rejects invalid formats)
- **Real-time race conditions**: Don't manually update state after Supabase mutations - let real-time events handle it
- **Date formats**: Use ISO 8601 strings for Supabase (`new Date().toISOString()`)
- **RLS conflicts**: If queries fail with "permission denied", check RLS policies in `schema.sql`

## Key Files to Reference
- **Data layer**: `src/hooks/useSupabase*.js`
- **Auth logic**: `supabase/AUTH_LOGIC.md`
- **Database schema**: `supabase/schema.sql`
- **Admin pages**: `src/pages/admin/FinalPipeline.jsx` (pipeline), `Agenda.jsx` (calendar)
- **Client pages**: `src/pages/client/ClientDashboardPage.jsx`

## Environment Setup
```bash
# .env (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---
**Before modifying database schema or auth**: Read `supabase/` documentation. For feature additions: Use existing Supabase hooks as templates.
