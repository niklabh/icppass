// Import required libraries
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { createActor } from './declarations/icppass_backend';

// Constants
const LOCAL_IDENTITY_KEY = 'icppass_identity';
const CANISTER_ID = process.env.CANISTER_ID_ICPPASS_BACKEND || 'rrkah-fqaaa-aaaaa-aaaaq-cai'; // Default local canister ID
const HOST = process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4943';

// State management
let authClient = null;
let actor = null;
let currentView = 'login';
let currentSiteCredentials = [];
let currentUrl = '';
let currentDomain = '';

// DOM elements
const views = {
  login: document.getElementById('login-view'),
  passwords: document.getElementById('passwords-view'),
  passwordForm: document.getElementById('password-form-view')
};

// Initialize the extension popup
async function init() {
  try {
    // Get current tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      currentUrl = tabs[0].url;
      const url = new URL(currentUrl);
      currentDomain = url.hostname;
      
      // Update UI with current site info
      document.getElementById('site-domain').textContent = currentDomain;
      document.getElementById('site-favicon').src = `https://www.google.com/s2/favicons?domain=${currentDomain}`;
      
      // Set website field in the form
      document.getElementById('website').value = currentDomain;
    }
    
    // Initialize auth client
    authClient = await AuthClient.create();
    const isAuthenticated = await authClient.isAuthenticated();
    
    if (isAuthenticated) {
      await handleAuthenticated();
    } else {
      showView('login');
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Show the specified view and hide others
function showView(viewName) {
  currentView = viewName;
  
  Object.keys(views).forEach(key => {
    if (key === viewName) {
      views[key].classList.remove('hidden');
    } else {
      views[key].classList.add('hidden');
    }
  });
}

// Handle authenticated state
async function handleAuthenticated() {
  try {
    const identity = authClient.getIdentity();
    
    // Create agent and actor
    const agent = new HttpAgent({
      identity,
      host: HOST
    });
    
    // When developing locally we need to disable certificate verification
    if (process.env.NODE_ENV !== 'production' && process.env.DFX_NETWORK !== 'ic') {
      agent.fetchRootKey().catch(err => {
        console.warn('Unable to fetch root key. Check your local replica is running');
        console.error(err);
      });
    }
    
    actor = createActor(CANISTER_ID, { agent });
    
    // Show passwords view and load passwords for current site
    showView('passwords');
    await loadPasswordsForCurrentSite();
  } catch (error) {
    console.error('Authentication error:', error);
  }
}

// Login with Internet Identity
async function login() {
  try {
    await authClient.login({
      identityProvider: process.env.DFX_NETWORK === 'ic'
        ? 'https://identity.ic0.app/#authorize'
        : `http://localhost:4943?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}`,
      onSuccess: async () => {
        await handleAuthenticated();
      },
      onError: error => {
        console.error('Login error:', error);
      }
    });
  } catch (error) {
    console.error('Login process error:', error);
  }
}

// Logout
async function logout() {
  try {
    await authClient.logout();
    actor = null;
    showView('login');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Load passwords for current site
async function loadPasswordsForCurrentSite() {
  if (!actor || !currentDomain) return;
  
  try {
    // Show loading state
    const credentialsList = document.getElementById('credentials-list');
    const loadingEl = credentialsList.querySelector('.loading');
    const emptyStateEl = credentialsList.querySelector('.empty-state');
    
    loadingEl.classList.remove('hidden');
    emptyStateEl.classList.add('hidden');
    
    // Remove existing credential items
    document.querySelectorAll('.credential-item').forEach(el => el.remove());
    
    // Get all passwords
    const result = await actor.getAllPasswords();
    
    if ('ok' in result) {
      // Filter for current domain
      currentSiteCredentials = result.ok.filter(
        entry => entry.website.includes(currentDomain)
      );
      
      // Display credentials or empty state
      if (currentSiteCredentials.length > 0) {
        currentSiteCredentials.forEach(cred => {
          const credItem = document.createElement('div');
          credItem.className = 'credential-item';
          credItem.innerHTML = `
            <h3>${cred.username}</h3>
            <p>${cred.website}</p>
          `;
          
          credItem.addEventListener('click', () => {
            fillCredentialsOnPage(cred);
          });
          
          credentialsList.insertBefore(credItem, loadingEl);
        });
        
        emptyStateEl.classList.add('hidden');
      } else {
        emptyStateEl.classList.remove('hidden');
      }
    } else {
      console.error('Failed to load passwords:', result.err);
    }
    
    loadingEl.classList.add('hidden');
  } catch (error) {
    console.error('Error loading passwords:', error);
  }
}

// Fill credentials on the current page
async function fillCredentialsOnPage(credential) {
  try {
    await chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'fillCredentials',
          username: credential.username,
          password: credential.password
        },
        response => {
          if (response && response.success) {
            window.close(); // Close the popup after filling
          }
        }
      );
    });
  } catch (error) {
    console.error('Error filling credentials:', error);
  }
}

// Save a new password entry
async function savePassword(event) {
  event.preventDefault();
  
  if (!actor) return;
  
  const formEl = document.getElementById('password-form');
  const formData = new FormData(formEl);
  
  const passwordEntry = {
    id: crypto.randomUUID(),
    website: formData.get('website'),
    username: formData.get('username'),
    password: formData.get('password'),
    notes: formData.get('notes') || '',
    lastUpdated: Date.now() * 1000000 // Convert to nanoseconds
  };
  
  try {
    const result = await actor.savePassword(passwordEntry);
    
    if ('ok' in result) {
      await loadPasswordsForCurrentSite();
      showView('passwords');
    } else {
      console.error('Failed to save password:', result.err);
      // Show error message to user
    }
  } catch (error) {
    console.error('Error saving password:', error);
  }
}

// Generate a secure password
function generatePassword(length = 16) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Search passwords
async function searchPasswords() {
  if (!actor) return;
  
  const searchTerm = document.getElementById('search-input').value.trim();
  
  if (!searchTerm) {
    await loadPasswordsForCurrentSite();
    return;
  }
  
  try {
    const result = await actor.searchPasswords(searchTerm);
    
    if ('ok' in result) {
      // Update UI with search results
      const credentialsList = document.getElementById('credentials-list');
      const loadingEl = credentialsList.querySelector('.loading');
      const emptyStateEl = credentialsList.querySelector('.empty-state');
      
      // Remove existing credential items
      document.querySelectorAll('.credential-item').forEach(el => el.remove());
      
      if (result.ok.length > 0) {
        result.ok.forEach(cred => {
          const credItem = document.createElement('div');
          credItem.className = 'credential-item';
          credItem.innerHTML = `
            <h3>${cred.username}</h3>
            <p>${cred.website}</p>
          `;
          
          credItem.addEventListener('click', () => {
            fillCredentialsOnPage(cred);
          });
          
          credentialsList.insertBefore(credItem, loadingEl);
        });
        
        emptyStateEl.classList.add('hidden');
      } else {
        emptyStateEl.classList.remove('hidden');
      }
    } else {
      console.error('Search failed:', result.err);
    }
  } catch (error) {
    console.error('Error during search:', error);
  }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  init();
  
  // Auth
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Navigation
  document.getElementById('add-password-btn').addEventListener('click', () => {
    document.getElementById('form-title').textContent = 'Add Password';
    document.getElementById('password-form').reset();
    document.getElementById('website').value = currentDomain;
    showView('passwordForm');
  });
  
  document.getElementById('cancel-btn').addEventListener('click', () => {
    showView('passwords');
  });
  
  // Form submission
  document.getElementById('password-form').addEventListener('submit', savePassword);
  
  // Password generation
  document.getElementById('generate-password').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    passwordInput.value = generatePassword();
    passwordInput.type = 'text';
  });
  
  // Toggle password visibility
  document.getElementById('toggle-password').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  });
  
  // Search
  document.getElementById('search-btn').addEventListener('click', searchPasswords);
  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      searchPasswords();
    }
  });
  
  // View all button
  document.getElementById('view-all-btn').addEventListener('click', async () => {
    // Open main web app in a new tab
    const url = process.env.DFX_NETWORK === 'ic'
      ? `https://${process.env.CANISTER_ID_ICPPASS_FRONTEND}.ic0.app/`
      : `http://localhost:4943/?canisterId=${process.env.CANISTER_ID_ICPPASS_FRONTEND}`;
    
    await chrome.tabs.create({ url });
  });
}); 