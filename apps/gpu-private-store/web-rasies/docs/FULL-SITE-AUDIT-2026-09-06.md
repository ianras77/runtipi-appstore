# Rasies full-site audit and implementation plan

## Release standard

The site is ready for family release only when the source, managed mirror, persisted environment, running container, and real browser/user paths agree. Health alone is not release proof.

## Audit findings

### Identity and copy

- The portal correctly separates three concepts, but this distinction must remain explicit everywhere: media-service signup at `signup.rasies.com`, full family-account request through Authentik, and sign-in to the family app library.
- The homepage, apps guide, family access panel, and House Chat now use the same service vocabulary. Avoid calling media signup a general family account.
- House Chat is the authoritative help surface for “which link do I use?”, signup steps, service availability, and family-account orientation.

### Mastra routing

- House Chat requests now carry stable browser `sessionId` and `threadId` values, with the existing persisted thread history providing bounded continuity.
- Direct URL-answer shortcuts were removed from the House Chat route. Directory, signup, service-state, archive, and web-search answers must be produced through Mastra tools and the RassyMind model.
- The House policy now explains what Rasies is and tells the model to distinguish media signup from Authentik family access and to use tool-returned links only.
- Search suggestion generation is RassyMind-backed and is reported as `mastra-rassymind`; its bounded fallback is explicitly named rather than misidentified as Cheshire.
- The spotlight workflow remains a Mastra-owned routine and its prompts now include sign-in and family-account help.

### Sign-up and sign-in path

1. For Plex/media access, open the live Wizarr invitation or request an invite from the Media services signup panel.
2. For the wider family account, use the Authentik family-access request link.
3. For an existing family member, use the Authentik sign-in/app-library link.
4. House Chat can explain these choices, list the currently available media services, check invite status, and create an invite only after explicit approval.

## Implementation plan and status

1. **Audit and source reconciliation — complete.** Mapped routes, pages, copy, links, Mastra agents/tools/workflows, signup APIs, search, and browser state.
2. **Mastra boundary — complete in source.** Removed pre-Mastra chat shortcuts and added model context for session, access level, locale, and link safety.
3. **Session continuity — complete in source.** Stable session/thread identifiers are persisted in browser storage and sent on chat requests; server memory remains bounded and best-effort.
4. **Copy and suggestion provenance — complete in source.** Updated policy/workflow language and removed the misleading Cheshire source label.
5. **Automated qualification — complete.** Server: 54 tests passed. Web: 14 tests passed. Server and web production builds passed.
6. **Managed release — pending external runtime operation.** Synchronize this app subtree to the root-owned managed mirror, rebuild/recreate the real `web-rasies_gpu-private-store` portal, and re-run live probes.
7. **Family release qualification — pending live browser proof.** Verify the actual public links, Authentik request/sign-in, Wizarr invite/status, House Chat signup guidance, search suggestions, route transitions, and mobile layout from the deployed site.

## Required live proof

- `/healthz` and `/api/house/health`
- `/api/config` has the intended public URLs
- `/api/signup/services`, invite creation, invite status, and the returned invite URL
- `/api/search/suggestions` reports `mastra-rassymind` or the explicit bounded fallback
- House Chat stream includes the supplied stable session/thread context in the request and answers signup questions using the real links
- Public link checks for `search.rasies.com`, `signup.rasies.com`, `auth.rasies.com`, media services, and family app library
- Browser checks for every homepage CTA, `/apps`, stories, thoughts, music, search, chat, signup, and account lanes

## Known boundaries

The source change does not by itself publish or restart the root-owned managed mirror. No password, token, or private family data belongs in this document or in browser storage. Thread memory is intentionally bounded; it supports continuity, not identity or authorization.
