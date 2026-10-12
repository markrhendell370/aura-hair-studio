# Aura Hair & Perm

A responsive salon website and appointment-management app for Aura Hair & Perm. The project uses React + Vite, Firebase Authentication, and Firebase Realtime Database, and is configured for the existing GitHub repository and GitHub Pages URL.

## Features

- Public landing page with service cards and live PHP price/time estimator.
- Customer registration, login, and logout using Firebase Authentication.
- Appointment booking wizard inspired by the supplied date-and-time reference.
- Dynamic prices by service and hair length, estimated service duration, and a 15-minute buffer.
- Customer dashboard to view, edit, and cancel appointments with a confirmation modal.
- Admin appointment table with search, status filters, status updates, and record deletion.
- Responsive layout for mobile and desktop.
- Data persists in Firebase Realtime Database.

## Tech stack

- React 18, Vite, React Router
- Firebase Authentication
- Firebase Realtime Database
- Lucide icons
- GitHub Pages + GitHub Actions

## Run locally

1. Install Node.js 20 or newer.
2. Clone this repository and enter the folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL shown by Vite.

## Firebase setup (required)

The Firebase web app config is in `src/firebase.js`. Web API keys are identifiers, not server passwords; security comes from Authentication and database rules. Do not put private service-account credentials in this frontend.

1. In Firebase Console, open project `aura-hair-studio-a13e1`.
2. Under **Authentication → Sign-in method**, enable **Email/Password**.
3. Under **Realtime Database → Rules**, publish the contents of `database.rules.json`.
4. Under **Authentication → Users**, create an admin account manually. Register/log in to the app once using that account, then in Realtime Database create `admins/ADMIN_UID` with value `true` (replace `ADMIN_UID` with that user's Firebase UID). The app checks this protected admin allowlist; clients cannot write to it.
5. Register a normal customer account from the website to test customer flow.

> Important: Firebase rules must be reviewed and tested in the Firebase Rules Simulator before public use. The included rules are a classroom-project starting point, not a full production security audit. Admin status is assigned manually in the protected `admins` path by the project owner.

## Deploy to the existing GitHub Pages site

The Vite base path is set to `/aura-hair-studio/` for:
https://markrhendell370.github.io/aura-hair-studio/

1. Put these files into the repository `markrhendell370/aura-hair-studio`.
2. Commit and push to the `main` branch.
3. In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` builds the site and deploys the `dist` folder.
5. Wait for the Actions workflow to finish, then reload the Pages URL.

## Test accounts

For safety, the app does not hard-code a public admin password or create privileged accounts automatically. Create test accounts using the registration form and promote one test account to admin in the Firebase Console as described above. Keep demo credentials private and change them before any public presentation.

## AI disclosure

AI assistance was used to help draft the initial UI, React components, Firebase integration outline, styling, and README. The student should review, test, and be prepared to explain all code before submission.

## Notes

- Booking times are shown in the salon's local browser timezone. The app blocks time slots already used on the same date; more robust overlap checks and transactions should be added before real-world production use.
- The Treatment duration is estimated at 60 minutes plus the 15-minute buffer because the requirements specify a price but no treatment duration.
- GitHub Pages is static hosting. Firebase provides the authentication and persistent database.
