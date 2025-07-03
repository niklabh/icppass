# ICPPass Extension Build Instructions

This document explains how to set up, build, and install the ICPPass Chrome extension.

## Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)

## Installation

1. Clone the repository:
```
git clone [repository-url]
cd icppass
```

2. Install the project dependencies:
```
npm install
```

## Building the Extension

1. Build the extension using webpack:
```
npm run build:extension
```

This will:
- Bundle all JavaScript files with their dependencies
- Process and optimize all assets
- Output the compiled extension to the `dist/extension` directory

2. Package the extension (optional):
```
npm run package:extension
```

This will create a zip file `dist/extension.zip` that can be uploaded to the Chrome Web Store.

## Installing the Extension in Development Mode

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" and select the `dist/extension` directory
4. The ICPPass extension should now be installed and visible in your extensions list

## Project Structure

- `src/icppass_extension/`: Contains the source code for the extension
  - `background.js`: Background service worker script
  - `popup.js`: Script for the extension popup
  - `content.js`: Content script injected into web pages
  - `welcome.js`: Script for the welcome page
  - `popup.html`: HTML for the extension popup
  - `welcome.html`: Welcome page HTML
  - `popup.css`: Styles for the extension popup
  - `manifest.json`: Extension manifest file
  - `declarations/`: Contains Internet Computer canister declarations

## Development Notes

- The extension uses the Internet Computer's production canisters (defined in `canister_ids.json`)
- Authentication is handled through Internet Identity
- The build process uses webpack to bundle dependencies and optimize code

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Ensure all dependencies are installed (`npm install`)
3. Try rebuilding the extension (`npm run build:extension`)
4. If changes aren't reflected, try reloading the extension from `chrome://extensions` 