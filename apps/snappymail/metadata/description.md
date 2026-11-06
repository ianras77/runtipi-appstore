# SnappyMail

SnappyMail is a fast, responsive webmail client. It connects to mail accounts on your existing IMAP and SMTP servers; it does not host mailboxes or deliver mail itself.

## First start

Open `/?admin` on the app URL to configure the webmail client and add your IMAP/SMTP domains. The initial admin password is stored at `/var/lib/snappymail/_data_/_default_/admin_password.txt` inside the container. Retrieve it from the Runtipi app's container console, then change it in the admin panel. The app data volume persists settings, contacts, and user data.
