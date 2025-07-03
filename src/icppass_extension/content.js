// Content script for ICPPass extension
// This script runs in the context of web pages and handles password autofill

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillCredentials') {
    fillCredentials(message.username, message.password)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Failed to fill credentials:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

// Find and fill username and password fields
async function fillCredentials(username, password) {
  // Find username/email field
  const usernameFields = findUsernameFields();
  
  // Find password field
  const passwordFields = findPasswordFields();
  
  if (usernameFields.length > 0 && passwordFields.length > 0) {
    // Fill in the fields
    fillField(usernameFields[0], username);
    fillField(passwordFields[0], password);
    
    return true;
  } else {
    throw new Error('Could not find username or password fields on this page');
  }
}

// Find potential username/email input fields
function findUsernameFields() {
  const selectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name*="email"]',
    'input[autocomplete="email"]',
    'input[name="username"]',
    'input[name*="user"]',
    'input[name*="login"]',
    'input[id="email"]',
    'input[id*="email"]',
    'input[id="username"]',
    'input[id*="user"]',
    'input[id*="login"]',
    'input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"])'
  ];
  
  return findFieldsBySelectors(selectors);
}

// Find potential password input fields
function findPasswordFields() {
  const selectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[name*="pass"]',
    'input[id="password"]',
    'input[id*="pass"]',
    'input[autocomplete="current-password"]'
  ];
  
  return findFieldsBySelectors(selectors);
}

// Helper function to find input fields by selectors
function findFieldsBySelectors(selectors) {
  let fields = [];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    
    for (const element of elements) {
      // Check if the element is visible and editable
      if (isElementVisible(element) && !element.disabled && !element.readOnly) {
        // Prioritize fields that are actually visible in the viewport
        if (isInViewport(element)) {
          fields.unshift(element); // Add to beginning of array
        } else {
          fields.push(element); // Add to end of array
        }
      }
    }
    
    // If we found any visible fields with this selector, stop searching
    if (fields.length > 0) {
      break;
    }
  }
  
  return fields;
}

// Check if an element is visible
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 &&
         element.offsetHeight > 0;
}

// Check if an element is in the viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Fill an input field and trigger appropriate events
function fillField(element, value) {
  // Focus the element
  element.focus();
  
  // Set the value
  element.value = value;
  
  // Trigger input event
  const inputEvent = new Event('input', { bubbles: true });
  element.dispatchEvent(inputEvent);
  
  // Trigger change event
  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);
  
  // Blur the element
  element.blur();
}

// Add a visual indicator when extension is active
function addVisualIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'icppass-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: #29abe2;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    z-index: 9999;
    font-family: sans-serif;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  indicator.textContent = 'ICPPass Active';
  
  document.body.appendChild(indicator);
  
  // Show briefly then fade out
  setTimeout(() => {
    indicator.style.opacity = '1';
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 2000);
  }, 100);
}

// Notify the background script that the content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' }); 