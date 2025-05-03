# Changelog

## v1.2.1

Fixed an issue with loading extensions.

### Fixed

- Fixed loading extensions using `data:` or `file:` protocols while offline

## v1.2.0

The app should now auto update.

### Added

- The app now has an automatic updater

## v1.1.0

If you previously loaded an extension while online, you will now be able to use it while offline.

### Added

- Added an extension cache

### Changed

- Changed how logs are handled internally

## v1.0.1

Added logs and fixed addons.

### Added

- Logs are now stored in the appdata folder
    -   For Windows: `%localappdata%/com.penguinmod.app/logs`
    -   For MacOS: `~/Library/Logs/com.penguinmod.app`
    -   For Linux: `~/.local/share/com.penguinmod.app/logs`

### Fixed

- The addon button now correctly opens the addon page

## v1.0.0

Initial release
