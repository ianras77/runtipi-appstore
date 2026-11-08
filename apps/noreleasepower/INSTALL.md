# NoReleasePower

NoReleasePower is a Discourse community for thoughtful, curious, respectful conversation grounded in personal agency. This package includes the forum, PostgreSQL 18 with the Discourse PostgreSQL image, and Redis. It persists the forum's `/shared` data (including uploads), PostgreSQL data, and Redis data under the app's Runtipi data directory.

## Before opening the site

1. Set a public hostname for the app in Runtipi and make sure its HTTPS proxy route points to this app.
2. Configure working SMTP credentials. Discourse relies on email for account activation, invitations, notifications, and password resets. Leaving SMTP unset is suitable only for initial evaluation.
3. Register the administrator account using the configured Site administrator email. The first account with that address is granted administrator privileges on a new instance.
4. Review site name, signup policy, moderation, terms, privacy, and retention settings before inviting members.

## Suggested starting structure

Use categories to express audience and participation type, and tags for subjects that cross categories.

| Category | Suggested access | Use |
| --- | --- | --- |
| Start Here | Public | Purpose, principles, participation guide, and membership information |
| Public Library | Public | Foundational articles and contributions explicitly approved for public release |
| Conversations & Reflections | Approved members | Questions, introductions, everyday observations, and discussion |
| Support & Check-Ins | Approved members | Requests for listening, encouragement, perspective, or practical ideas |
| Personal Journals | Approved members | A member's continuing journal topic, with replies over time |
| Member Articles & Reading Circle | Approved members | Member-authored essays, reading discussions, and shared resources |

Create an approved-member group and set category permissions for that group. Keep public reading, member reading, replying, and topic creation permissions deliberate. Journals in this design are shared with approved members, not private diaries. Use topic templates for support requests and article prompts, and keep authored articles distinct from collaboratively maintained wiki guides. Publish a member's work publicly only after getting that author's permission.

The package installs Discourse; it does not automatically create these categories, groups, templates, tags, editorial processes, or starter articles. Suggested subject tags include relationships, routines, meditation, self-discipline, Taoism, Stoicism, and Brahmacharya where they fit actual community discussions.

## Image and support status

This package uses the official `discourse/discourse:2026.7.4` web image with `discourse/postgres:pg18`. Discourse's current Compose-friendly image is described upstream as experimental; Discourse's documented supported self-hosting route remains the official `discourse_docker` launcher. This Runtipi package is therefore a convenient, current Compose-based deployment, but it is not an officially supported production install. Review the upstream release notes and keep verified backups before upgrades. The first start performs database initialization, migrations, and asset compilation and may take several minutes.

## Backups and upgrades

Back up the complete app data directory, including `shared`, `postgres`, and `redis`, before upgrading. Do not upgrade PostgreSQL's major version by changing the image tag without following the Discourse PostgreSQL upgrade instructions. Discourse application updates require a coordinated database migration; test upgrades against a backup before applying them to the live community.
