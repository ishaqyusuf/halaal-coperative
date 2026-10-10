# ADR — Validate support attachment links at write and display boundaries

Status: accepted for implementation.

Support cases accept user-supplied attachment links. URL syntax validation alone admits `javascript:`, `data:` and `file:` schemes, while dashboard actions previously stored even unvalidated strings. Messages render their saved link as a dashboard anchor. A shared URL rule now permits only HTTPS links without embedded credentials or local/literal-IP hosts and exact `/api/uploads/{uuid}` private paths, bounded to 1,000 characters and free of control characters or backslashes. Database writes enforce it for both dashboard and mobile callers; mobile schemas reject invalid input earlier. The dashboard also suppresses unsafe historical links and unsafe in-progress input previews.

The private path remains subject to the existing tenant/uploader/purpose/message claim. External HTTPS content is still outside HalaalVest's custody and is not verified for safety, availability or ownership. Private Blob activation and retention remain separate gates.
