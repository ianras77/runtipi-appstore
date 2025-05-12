# 🎉 Wallabag: Your Self-Hosted Read-It-Later Oasis!

Welcome to **Wallabag**, the ultimate distraction-free article saver that lives on your own server. No more subscriptions, no more ads—just you and your reading list. 🚀

---

## 🔍 What’s Inside?

| Feature                  | Emoji | Description                                      |
| ------------------------ | ----- | ------------------------------------------------ |
| Clean Reading View       | 🧹    | Strips away clutter for seamless focus           |
| Tags & Highlights        | ✨    | Organize and mark your favorite passages         |
| Full-Text Search         | 🔎    | Find any article or highlight in seconds         |
| Multi-Device Sync        | 🔄    | Access your library on phone, tablet, or desktop |
| EPUB Export              | 📖    | Download your articles for offline reading       |

---

## 🛠️ Under the Hood
- **MariaDB** stores your content safely 🗄️
- **Wallabag App** extracts and renders articles in PHP 🐳
- **Docker Containers** ensure quick spin-up and easy updates 🐋

All orchestrated dynamically via Runtipi’s **Dynamic Compose**—no manual YAML tweaking required.

---

## ⚙️ Configuration & Deployment
1. **Dynamic Settings**: Fill in `config.json` form fields (DB credentials, mailer URL) on install.
2. **One-Click Install**:
   ```bash
   runtipi apps install wallabag
