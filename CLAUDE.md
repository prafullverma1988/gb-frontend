# gb-frontend — Sanchalan ERP web app (React CRA, Vercel → sanchalanapp.com)

- Real users on production. `git push origin main` deploys live via Vercel —
  never push without Prafull's explicit go-ahead.
- Module independence: no shared components between modules — each module file
  is fully self-contained (deliberate architecture, do not "refactor" it away).

## ⚠️ KB RULE — update the support-bot KB with every UI change

The WhatsApp support bot answers users from `gb-backend/kb/*.md`. **Any change
to a screen, tab, button label, form field, validation, toast/error text, or
permission gate in this repo MUST be reflected in the matching KB file in
`C:\Users\prafu\gb-backend\kb\` as part of the same piece of work.**
See `gb-backend/kb/README.md` for the file→module map and writing rules
(Roman Hinglish, verbatim labels, document only what exists in code).
