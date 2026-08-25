# Money Tracker

A simple personal money tracker built with HTML, CSS, and JavaScript.

## Features
- Add income and expense records
- Filter records by month
- Set a monthly expense budget with progress tracking
- Edit existing records
- Export transactions as CSV
- Backup and restore all personal data as JSON
- Mark transactions as one-time or monthly
- Store budgets per month
- Save data automatically in the browser using localStorage
- View total income, total expense, and balance
- Delete individual records or clear all
- Works as a static web app that can be shared via a link after hosting

## How to use it
1. Open `index.html` in a browser.
2. Add your transaction details.
3. Your data stays saved in the browser.

## To share it as a link
You can host the folder on GitHub Pages:
1. Push the folder to a GitHub repository.
2. Open the repository in GitHub.
3. Go to Settings > Pages.
4. Select the main branch and save.
5. Use the generated link.

## Files
- `index.html` - page structure
- `styles.css` - design and layout
- `script.js` - money tracking logic and local storage
- `supabase-schema.sql` - secure online database schema for the portfolio version
- `supabase-migration-v2.sql` - safe update if the original schema was already run

## Portfolio version

The current browser version includes a local login prototype so the interface and personal-data flow can be tested without a backend. Do not use it for real passwords: browser storage is not secure authentication.

For the production portfolio version, create a free Supabase project and run `supabase-schema.sql` in its SQL Editor. The schema includes real authentication-related tables and Row Level Security so each user can access only their own profile, categories, transactions, and budgets. If you already ran the original schema before the newer features were added, run `supabase-migration-v2.sql` instead of running the full schema again.

The frontend is configured with the project's public URL and publishable key, and the login screen now uses Supabase Auth. Never place a Supabase service-role or secret key in frontend code.
