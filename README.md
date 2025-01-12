# hl-aliases-extension

A Chrome extension that enhances your web3 browsing experience by replacing Hyperliquid addresses with human-readable aliases.

## Features

- 🔄 Automatically replaces Hyperliquid addresses with aliases across any webpage
- 🔍 Supports multiple address formats:
  - Full addresses (0x1234...5678)
  - Truncated addresses (0x9...690)
  - End-only addresses
- 📋 Right-click context menu for quick Hypurrscan lookup
- ⌨️ Keyboard shortcut (Alt+H) for instant address lookup
- 💾 Multiple ways to import aliases:
  - Import from Hypurrscan API
  - Load from local JSON file
  - Import from Hypurrscan localStorage

## Installation

1. Clone this repository:
```bash
git clone https://github.com/lafourb/hl-aliases-extension.git
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

## Usage

### Basic Usage

1. Click the extension icon in your browser toolbar
2. Toggle the switch to enable/disable address replacement
3. Import aliases using one of the available methods
4. Browse any web3 site to see addresses replaced with aliases

### Supported Websites

The extension has been tested and works on the following websites:
- [Hypurr Pump](https://app.hypurr.fun/launch) - Pump monitoring website
- [Dexscreener](https://dexscreener.com) - Real-time DEX trading charts and data
- [Hyperliquid Leaderboard](https://app.hyperliquid.xyz/leaderboard) - Official Hyperliquid leaderboard

### Importing Aliases

You can import aliases in several ways:

- **Hypurrscan API**: Click "Import from Hypurrscan" to fetch global aliases shared by the community
- **Local File**: Use "Load Local File" to import a JSON file with your custom aliases
- **Hypurrscan localStorage**: Navigate to hypurrscan.io and click "Import from localStorage" to import all aliases you've created or customized on Hypurrscan. This imports both standard aliases and any custom naming you've done on the platform.

### JSON Format

When importing from a local file, use the following format:

```json
{
  "0x1234567890123456789012345678901234567890": "Trader1",
  "0x0987654321098765432109876543210987654321": "Hyperliquid Foundation"
}
```

### Keyboard Shortcuts

- `Alt+H`: Lookup selected address on Hypurrscan

## Development

### Project Structure

```
├── background.js    # Background service worker
├── content.js       # Content script for address replacement
├── manifest.json    # Extension manifest
├── popup.html      # Extension popup interface
└── popup.js        # Popup functionality
```

### Building

No build step required - the extension can be loaded directly into Chrome in developer mode.

### Testing

1. Load the extension in developer mode
2. Visit any web3 site (e.g., Hypurrscan, dApps)
3. Test address replacement and all import methods
4. Verify context menu and keyboard shortcut functionality

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Privacy

This extension:
- Does not collect any user data
- Only accesses webpage content to replace addresses
- Makes API calls only to Hypurrscan when explicitly requested
- Stores aliases locally in Chrome storage

## Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/lafourb/hl-aliases-extension/issues) page
2. Open a new issue if needed
3. Include your Chrome version and steps to reproduce the problem
