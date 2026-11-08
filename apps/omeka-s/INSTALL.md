# Omeka S

Omeka S is designed for collections that need linked cultural heritage records and multiple exhibits. This app uses the community-maintained `giocomai/omeka-s-docker` image; the Omeka project itself publishes source and installation guidance rather than a supported official container image. The package pins Omeka S 4.2.1 and supports amd64 only because that is the architecture published for this image.

The first start initializes the Omeka S database and administrator from the install form. The first start may take a few minutes. Persistent data lives in the app's `volume` and `mariadb` directories. Omeka files in `volume` include uploaded media and configured modules/themes.

The Docker image includes Omeka S core only. Install and maintain additional modules and themes intentionally, and back up both the complete app data directory and the MariaDB database before upgrades. Follow Omeka's upgrade instructions when changing application versions.
