// Background script for ICPPass extension
// This script runs in the background and handles communication between the content scripts and popup

// Listen for installation or update of the extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('ICPPass extension installed');
    
    // Open the welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('ICPPass extension updated');
  }
});

// Track active tabs where content scripts are running
const activeContentScripts = new Set();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Track which tabs have content scripts loaded
  if (message.action === 'contentScriptReady' && sender.tab) {
    activeContentScripts.add(sender.tab.id);
  }
  
  // Handle messages related to authentication state
  if (message.action === 'authStateChanged') {
    // Update the extension icon based on authentication state
    updateExtensionIcon(message.isAuthenticated);
  }
  
  // Handle messages related to password detection
  if (message.action === 'passwordFieldsDetected' && sender.tab) {
    // Show page action icon
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        "16": "icons/icon16_active.png",
        "48": "icons/icon48_active.png"
      }
    });
  }
  
  // Handle mobile sync requests
  if (message.action === 'requestMobileSync') {
    // Generate a sync code or QR code
    const syncCode = generateSyncCode();
    sendResponse({ syncCode });
    return true;
  }
});

// Update the extension icon based on authentication state
function updateExtensionIcon(isAuthenticated) {
  const iconPath = isAuthenticated ? {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  } : {
    "16": "icons/icon16_gray.png",
    "48": "icons/icon48_gray.png",
    "128": "icons/icon128_gray.png"
  };
  
  chrome.action.setIcon({ path: iconPath });
}

// Generate a temporary sync code for mobile devices
function generateSyncCode() {
  // Generate a random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Listen for tab updates to reset icons
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    // Reset icon for this tab
    chrome.action.setIcon({
      tabId,
      path: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png"
      }
    });
  }
}); 