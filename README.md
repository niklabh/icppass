# ICPPass - Secure Password Manager on Internet Computer

ICPPass is a secure password manager built on the Internet Computer Protocol (ICP) by DFINITY. It utilizes the blockchain's security and decentralization to store your passwords safely while providing a seamless user experience through a web interface, browser extension, and mobile compatibility.

## Features

- **Secure Password Storage**: All passwords are encrypted and stored on the Internet Computer blockchain
- **Internet Identity Authentication**: No username/password required, authenticate with Internet Identity
- **Browser Extension**: Easily autofill passwords on websites
- **Cross-Platform Support**: Works on desktop browsers and iOS devices
- **Password Generator**: Create strong, unique passwords
- **Search Functionality**: Quickly find stored credentials

## Architecture

ICPPass consists of several components:

1. **Backend Canister (Motoko)**: Handles password storage, retrieval, and user authentication
2. **Frontend Web App (React)**: Provides a user-friendly interface for managing passwords
3. **Browser Extension**: Enables autofill functionality across websites
4. **Mobile Support**: Makes passwords accessible on iOS devices

## Getting Started

### Prerequisites

- [dfx](https://sdk.dfinity.org/docs/quickstart/local-quickstart.html) - The DFINITY Canister SDK
- Node.js and npm
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/icppass.git
cd icppass
```

2. Install dependencies:
```
npm install
```

3. Start the local Internet Computer replica:
```
dfx start --background
```

4. Deploy the canisters:
```
dfx deploy
```

### Usage

#### Web Application

After deployment, you can access the web application at:
- Local: `http://localhost:4943?canisterId=<frontend-canister-id>`
- IC Mainnet: `https://<frontend-canister-id>.ic0.app/`

#### Browser Extension

To install the browser extension for development:

1. Build the extension:
```
npm run build:extension
```

2. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/extension` directory

#### Mobile Access

The web application is responsive and works on mobile browsers. For iOS devices:

1. Navigate to the web application URL in Safari
2. Use the "Add to Home Screen" option to create a web app icon

## Development

### Project Structure

```
icppass/
├── dfx.json                   # DFINITY project configuration
├── package.json               # Node.js dependencies
├── src/
│   ├── icppass_backend/       # Motoko canister code
│   │   └── main.mo            # Backend logic
│   ├── icppass_frontend/      # React frontend application
│   │   ├── src/               # React components and logic
│   │   └── public/            # Static assets
│   └── icppass_extension/     # Browser extension code
│       ├── manifest.json      # Extension manifest
│       ├── popup.html         # Extension popup
│       └── content.js         # Content script for autofill
```

### Building for Production

To build the project for production:

```
dfx build
dfx canister install --all --mode=reinstall
```

## Security

ICPPass takes security seriously:

- All passwords are encrypted before being stored on the blockchain
- Authentication is handled by Internet Identity, a secure authentication system
- No master password is stored anywhere
- Communication is encrypted using TLS

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- DFINITY Foundation for creating the Internet Computer Protocol
- Internet Identity for providing secure authentication

## Contact

For questions or feedback, please open an issue in the GitHub repository.
