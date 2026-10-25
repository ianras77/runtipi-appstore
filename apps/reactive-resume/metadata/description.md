# Reactive Resume

Reactive Resume is an open-source resume builder. Create resumes, cover letters and job applications on your own server, with local persistent storage for uploaded images.

## First start

Open the app using its configured Runtipi address and create your first account. Signups are initially enabled so you can register. Then edit the app's Runtipi settings to disable new signups if this will be a private instance. Set the public URL in Runtipi before first launch; the app uses it for sign-in redirects and cookies.

Email delivery is optional and is not configured by this install. Without SMTP, verification and reset messages are written to the app logs. Back up both the PostgreSQL database and the `data/uploads` directory, and keep the authentication secret with those backups.
