# Email and exhibition workflow role

Goal: connect existing editor, contacts, artworks, PDF tools and exhibition workflow.

Read active email/exhibition page specs and contracts C–F. Inspect existing EmailStudioApp/compiler/storage/dispatch and exhibition actions before changing them. Preserve n8n JSON body and disabled/test/live switch.

Implement eligible recipient resolution, suppression, unsubscribe, durable dispatch claiming and truthful history; extend scheduling only if absent. Coordinate all schema changes with the shared-file owner. Timeout after an external request is unknown, not an automatic retry.

Exhibition catalogue uses current PDF pipeline and canonical ordered IDs. Invitation action creates/reopens a draft, never sends. Test with capture-only infrastructure and synthetic fixtures. Return concrete payload compatibility evidence, dedupe/consent tests and external setup blockers.
