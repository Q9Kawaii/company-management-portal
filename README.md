# Company Management Portal

**Live demo:** https://company-management-portal-five.vercel.app

An internal web portal for managing people and projects across a company, built with React, Vite, and Supabase. Every user signs in with a company ID (for example `EMP0003`) and sees a dashboard for their role: **Admin**, **HR**, **Employee**, or **Intern**.

Admins and HR manage accounts and set up project teams. Employees and interns work inside the projects they are assigned to, through a shared project timeline with threaded replies and file attachments.

---

## Features

### Role-based access
- Four roles (Admin, HR, Employee, Intern), each with its own layout, navigation, and dashboard.
- Route guards (`ProtectedRoute`) on the frontend, with PostgreSQL **Row Level Security** policies enforcing the same rules in the database.
- Sign in with a company ID instead of an email address. IDs are generated per role (`ADM0001`, `HR0001`, `EMP0001`, `INT0001`) by an atomic database function.

### User management
- Admins manage HR, employee, and intern accounts. HR manages employees and interns.
- Create, edit, search, and filter users by role, department, and status.
- Accounts are **deactivated, never deleted**, so project history and audit trails stay intact.
- User detail pages show each person's project history.

### Project management
- Two project categories: **Main Project** and **Intern-Based**.
- Project lifecycle: `Draft → Published → In Progress → Completed → Archived`.
- Assign a team lead and team members, review the setup, then publish it to the team.
- People already on an active project are hidden from new teams, so nobody is double-booked. Archiving a project frees its team automatically.
- Employees and interns see their current project and past projects.

### Project timelines
- **Main timeline:** the whole team can post updates, reply, and attach files.
- **Staff timeline:** a private channel that only Admin and HR can see.
- Threaded replies and file attachments up to 10 MB (images, PDF, Office documents, ZIP).
- Attachments live in a private storage bucket and are opened through short-lived signed URLs.

### Notifications
- Team members are notified when they're assigned to a published project, and see recent notifications with unread markers on their dashboard.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | [React 19](https://react.dev), [React Router 7](https://reactrouter.com) |
| Build tool | [Vite 8](https://vite.dev) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) and custom CSS |
| Backend | [Supabase](https://supabase.com): PostgreSQL, Auth, Storage, Edge Functions (Deno) |
| Utilities | [date-fns](https://date-fns.org) |
| Linting | ESLint 10 with the React Hooks and React Refresh plugins |

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org) 20 or later, and npm
- A [Supabase](https://supabase.com) project (the free tier works)

### 1. Clone and install

```bash
git clone https://github.com/Q9Kawaii/company-management-portal.git
cd company-management-portal
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then set the values from **Supabase Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Security:** use the **anon (public)** key only. Never put the `service_role` key in this file, because every `VITE_*` variable is bundled into the browser build. `.env` is listed in `.gitignore` and must not be committed.

### 3. Set up the database

Run the SQL files in `supabase/migrations/` **in numerical order**, either in the Supabase SQL Editor or with the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase db push`):

| Migration | Purpose |
| --- | --- |
| `001_create_profiles.sql` | User profiles linked to `auth.users` (`user_id` holds the company ID), plus the `updated_at` trigger |
| `002_create_projects.sql` | Projects with category, status, lead, and dates |
| `003_create_project_members.sql` | Project team assignments (Lead or Member) |
| `004_create_timelines.sql` | Main and Staff timelines per project, and their entries and replies |
| `005_create_attachments.sql` | Attachment metadata for timeline entries |
| `006_create_notifications.sql` | In-app notifications |
| `007_create_user_id_generation.sql` | Per-role counters and the `generate_user_code()` function |
| `008_configure_security_policies.sql` | Baseline Row Level Security policies and helper functions |
| `009_fix_access_and_integrity.sql` | Tightened access rules, the `project-attachments` storage bucket and its policies, and triggers that create timelines, keep `profiles.assigned` in sync, and record who published a project |
| `010_restrict_staff_timeline_rows.sql` | Hides Staff timelines from non-staff entirely |

Then run `supabase/seed.sql` to initialise the ID counters.

### 4. Deploy the Edge Functions

Account creation and company-ID sign-in need privileged keys, so they run as Edge Functions in `supabase/functions/`:

| Function | What it does | `verify_jwt` |
| --- | --- | --- |
| `company-login` | Takes `{ userId, password }` (a company ID or email), resolves it to the account's email, signs in through Supabase Auth, and returns `{ session }` | `true` |
| `create-user` | Called by Admin/HR. Generates a company ID, creates the Auth user, inserts the profile, and returns `{ user }` | `false` (checks the caller's token itself) |

```bash
supabase functions deploy company-login
supabase functions deploy create-user --no-verify-jwt
```

Set these secrets (**Dashboard → Edge Functions → Secrets**, or `supabase secrets set`):

| Secret | Used by | Value |
| --- | --- | --- |
| `PORTAL_SUPABASE_SECRET_KEY` | `company-login` | Your project's secret / service role key |
| `PROJECT_ANON_KEY` | `create-user` | Your project's anon key |
| `ALLOWED_ORIGINS` | both (optional) | Comma-separated frontend URLs, e.g. `http://localhost:5173,https://portal.example.com`. Defaults to `http://localhost:5173`. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

> When you deploy the frontend, add its URL to `ALLOWED_ORIGINS`. Otherwise the browser blocks sign-in with a CORS error.

### 5. Create the first Admin

1. In **Supabase Dashboard → Authentication → Users**, create a user with an email and password.
2. Copy that user's UUID, then uncomment and edit the example at the bottom of `supabase/seed.sql`, and run it.
3. Sign in to the portal with the company ID `ADM0001`.

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:5173.

---

## Usage

| Role | Signs in with | Can do |
| --- | --- | --- |
| **Admin** | `ADM####` | Manage HR, employees, and interns; view and manage every project; use both timelines; delete attachments and notifications |
| **HR** | `HR####` | Manage employees and interns; create, staff, review, and publish projects; use both timelines |
| **Employee** | `EMP####` | View the current and past projects they are assigned to; post, reply, upload, and delete their own posts on the Main timeline |
| **Intern** | `INT####` | Same as Employee, scoped to their assigned projects |

A typical project flow:

1. HR opens **Projects → Create**, picks a category, and assigns a lead and team members. The project is saved as a **Draft**, and the team is marked as assigned.
2. HR reviews the setup on the review page and **publishes** it. The team is notified.
3. The team sees the project under **Current Project** and works on the Main timeline. Admin and HR coordinate privately on the Staff timeline.
4. When HR or Admin archives the project, it moves to **Past Projects** for everyone on the team, and they become available for new projects.

> Account emails and passwords are set when an account is created and can't be changed from the portal, because sign-in depends on the matching Supabase Auth account. Change them in **Supabase Dashboard → Authentication** if needed.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot module reloading |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |

### Deploying to Vercel

The repo includes a `vercel.json` that builds with Vite and sends every route to `index.html`, so links like `/hr/projects` work when opened or refreshed.

1. Import the repo in Vercel (or run `npx vercel` in the project folder).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project → Settings → Environment Variables**.
3. Add the deployed URL to the `ALLOWED_ORIGINS` Edge Function secret in Supabase, or sign-in will be blocked by CORS.

---

## Folder structure

```
company-management-portal/
├── public/                     # Static files served as-is (favicon, icon sprite)
├── src/
│   ├── assets/                 # Logos and images imported by components
│   ├── components/
│   │   ├── auth/               # LoginForm, ProtectedRoute (role-based route guard)
│   │   ├── common/             # Navbar, Sidebar, Modal, ConfirmDialog, SearchBar, etc.
│   │   ├── projects/           # Project form, card, review, lead and member selectors
│   │   ├── timeline/           # Timeline feed, entries, composer, attachment uploader
│   │   └── users/              # User form, table, search, deactivate dialog
│   ├── context/                # AuthContext (session and profile), NotificationContext
│   ├── hooks/                  # useAuth, useNotifications (toasts), useTimeline
│   ├── layouts/                # Admin, HR, Member (Employee/Intern), and Auth layouts
│   ├── lib/
│   │   └── supabase.js         # Supabase client, configured from env variables
│   ├── pages/
│   │   ├── admin/              # Admin dashboard, manage HR/employees/interns/projects
│   │   ├── auth/               # Login page
│   │   ├── employee/           # Employee dashboard, current and past projects
│   │   ├── errors/             # 404 and Unauthorized pages
│   │   ├── hr/                 # HR dashboard, people, project create/details/review
│   │   ├── intern/             # Intern dashboard, current and past projects
│   │   └── AboutUs.jsx
│   ├── services/               # Timeline and attachment storage access (pages query
│   │                           # Supabase directly for users and projects)
│   ├── styles/                 # Global stylesheet
│   ├── utils/                  # Permissions matrix, validators, date formatting
│   ├── App.jsx                 # Route table and role-based redirects
│   └── main.jsx                # App entry point
├── supabase/
│   ├── functions/
│   │   ├── company-login/      # Edge Function: sign in with a company ID
│   │   └── create-user/        # Edge Function: Admin/HR create accounts
│   ├── migrations/             # Ordered SQL schema, RLS policies, and triggers
│   └── seed.sql                # ID counters and first-admin template
├── .env.example                # Template for required environment variables
├── eslint.config.js
├── index.html
├── package.json
└── vite.config.js
```

---

## Security notes

- Row Level Security is enabled on every table. The frontend permission checks in `src/utils/permissions.js` only shape the UI; the database policies are what actually enforce access.
- The Staff timeline, its entries, and its attachments are readable only by Admin and HR, enforced in the database and in storage.
- HR can only edit Employee and Intern profiles. Nobody can change an account's email or company ID from the client.
- Account creation and company-ID login run in Edge Functions, so passwords and the service role key never reach the browser.
- Attachments sit in a private bucket and are opened through signed URLs that expire after one hour.
- Recommended: turn on **leaked password protection** in **Supabase Dashboard → Authentication → Settings**.

---

## License

This project is licensed under the [MIT License](LICENSE).
