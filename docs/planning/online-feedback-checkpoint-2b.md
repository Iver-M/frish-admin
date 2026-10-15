# Online Consumer Feedback checkpoint 2B

The Admin deployment destination is now explicit: `.firebaserc` maps project `frish-app2026` and Hosting target `frish` to site `frish`. `firebase.online-test.json` publishes only `dist/online-test` and rewrites SPA routes to `/index.html`.

The only future Hosting command is:

```powershell
firebase deploy --project frish-app2026 --config firebase.online-test.json --only hosting:frish
```

The active rollback version recorded by the read-only preflight is `16b23254b72305f2`; the previous version is `e886006bdcb9dfee`. Stop before deployment if the project, target, site, build mode, production-disabled gate, or rollback version differs.

The existing `/feedback` page remains read-only and active-BFAR-only. Online mode requires the exact `feedbackOnlineTest: "consumer-feedback-v1"` claim, calls `listConsumerFeedback` in `asia-southeast1`, and initializes no direct feedback Firestore or Storage access. Its banner states that this is an online test environment, feedback is test data, submission does not mean BFAR review or reply, and production remains disabled.

The next checkpoint requires one exact email address for an existing team-controlled BFAR test account. Resolve exactly one account, preserve its complete previous claims, merge only the three approved claims, refresh/revoke tokens as required, and restore the preserved claims for rollback. Checkpoint 2B does not enumerate or modify accounts, deploy Hosting, or activate production.
