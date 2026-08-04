# Security Specification for Firestore

## Data Invariants
1. Comments must have a valid articleId, author, and text.
2. Subscriptions must have a valid email.

## The "Dirty Dozen" Payloads
(Specifically designed to break Identity, Integrity, and State)
1. Comment with empty text.
2. Comment with massive text (exceeding 5000 chars).
3. Comment with fake author (trying to impersonate another user).
4. Comment with invalid articleId format.
5. Subscription with invalid email format.
6. Subscription with empty email.
7. Attempt to update a comment.
8. Attempt to delete a comment (as non-admin).
9. Attempt to read all subscriptions (as non-admin).
10. Attempt to write to a arbitrary document in the `subscriptions` collection.
11. Comment with spoofed timestamp (trusting client time).
12. Comment with additional unauthorized fields.

## Test Runner (firestore.rules.test.ts)
(To be implemented in the future)
