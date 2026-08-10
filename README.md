# FRISH Admin Portal

FRISH is a role-based administration portal for monitoring fish freshness assessments, report workflows, and market enforcement activity at **Pasig Public Market**.

The project supports the FRISH capstone workflow: image-based freshness assessment, IoT-supported shelf-life monitoring, consumer and inspector reports, BFAR review, and LGU enforcement action.

## Roles and workflows

### BFAR-NCR Admin

- Review freshness assessments, including visual indicators, confidence, environmental readings, storage condition, shelf-life, and regulatory decision support.
- Review submitted reports for completeness, vendor and market details, and supporting evidence.
- Assign an authorized inspector, complete validation review, and forward confirmed cases to the LGU.
- Manage inspector accounts, administrator accounts, audit records, notifications, profile settings, and user feedback.

### LGU Market Admin

- Monitor escalated reports, pending actions, and vendors under watch.
- Review BFAR-forwarded findings and record administrative or enforcement decisions.
- Maintain vendor compliance and violation-history records for Pasig Public Market.
- Return final decisions to BFAR-NCR for documentation and monitoring.

## Main modules

- Role-based dashboard
- Assessment review workspace with filters and detailed inspection records
- BFAR report review and LGU escalated-report workflow
- Inspector management
- LGU vendor compliance and violation history
- Audit trail and notifications
- User feedback inbox
- Administrator and profile management

## Technology

- React 18
- Vite 5
- React Router
- React Icons
- Firebase Authentication, Firestore, and Storage

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local address shown in the terminal, usually `http://localhost:5173`.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Firebase

Firebase sign-in and the Firestore/Storage integration layer are ready to
connect when your Firebase project is available. Follow [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
to configure the project, profiles, and security rules.

## Project structure

```text
src/
  components/       Reusable UI components
  context/          Authentication and role context
  data/             Prototype data for Pasig Public Market
  layout/           Shared admin layout and navigation
  pages/admin/      BFAR and LGU admin modules
  utils/            Role and market-scoping helpers
```

## Notes

- This is a frontend prototype using local sample data by default.
- Set `VITE_USE_FIREBASE=true` in a configured `.env.local` file to enable Firebase Authentication. The service layer is ready for live Firestore and Storage records as the sample-data modules are migrated.
- The data model is intentionally scoped to Pasig Public Market for the current project implementation.
