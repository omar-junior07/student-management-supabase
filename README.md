# Student Management System — Supabase version

This version stores student records in a shared Supabase database so the same records can be accessed from multiple devices after an authorized user signs in.

## Files
- `index.html` — website structure and login form
- `style.css` — design and responsive layout
- `app.js` — login, database operations, grades, search, dashboard, and CSV export
- `config.js` — Supabase Project URL and publishable key placeholders

## Before uploading to GitHub Pages
1. In Supabase, open Project Settings → API Keys (or API settings).
2. Copy the Project URL and the **publishable** key (or legacy `anon`/`public` key).
3. Open `config.js` in a text editor and replace the two placeholder values. Keep the quotation marks.
4. Never use a `service_role` or secret key in browser code.
5. Upload all five files to the root of your existing GitHub Pages repository, replacing the old `index.html`, `style.css`, `app.js`, and `README.md`, and adding `config.js`.
6. Wait for GitHub Pages to finish publishing, then refresh the website.

Example `config.js` format:
```js
window.SUPABASE_URL = "https://your-project-ref.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_your_key_here";
```

## Supabase requirements
- Table: `public.students` with `id`, `name`, `mark`, and `created_at` columns.
- Row Level Security must be enabled.
- The four policies for authenticated users (SELECT, INSERT, UPDATE, DELETE) should be configured as described in the setup instructions.
- Email/password authentication should be enabled.
- Public sign-ups should be disabled. Create/invite only accounts you authorize.

## Notes
- Grades are calculated in the browser: A 80–100, B 70–79, C 60–69, D 50–59, F 0–49.
- The app currently supports up to 30 records in its user interface.
- The policies previously described grant all authenticated accounts access to all student records. Keep public sign-ups disabled and only create accounts for trusted users. For a production school system, use stricter per-user or role-based policies and backups.
- This is a learning project. Do not store highly sensitive student data until security, permissions, backups, and applicable privacy requirements have been reviewed.
