// Import required libraries
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { createActor } from './declarations/icppass_backend/index.js';

// Constants
const LOCAL_IDENTITY_KEY = 'icppass_identity';
const CANISTER_ID = '4rrk5-fyaaa-aaaad-aawzq-cai'; // Production canister ID from canister_ids.json
const HOST = 'https://ic0.app'; // Always use production IC host

// State management
let authClient = null;
let actor = null;
let currentView = 'login';
let currentSiteCredentials = [];
let currentUrl = '';
let currentDomain = '';

// DOM elements
let views = {};

// Initialize the extension popup
async function init() {
  try {
    // Initialize DOM elements
    views = {
      login: document.getElementById('login-view'),
      passwords: document.getElementById('passwords-view'),
      passwordForm: document.getElementById('password-form-view')
    };

    // Get current tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      currentUrl = tabs[0].url;
      try {
        const url = new URL(currentUrl);
        currentDomain = url.hostname;
        
        // Update UI with current site info
        const siteDomainEl = document.getElementById('site-domain');
        if (siteDomainEl) siteDomainEl.textContent = currentDomain;
        
        const siteFaviconEl = document.getElementById('site-favicon');
        if (siteFaviconEl) siteFaviconEl.src = `https://www.google.com/s2/favicons?domain=${currentDomain}`;
        
        // Set website field in the form
        const websiteEl = document.getElementById('website');
        if (websiteEl) websiteEl.value = currentDomain;
      } catch (urlError) {
        console.error('Invalid URL:', urlError);
        currentDomain = 'unknown';
      }
    }
    
    // Initialize auth client
    try {
      authClient = await AuthClient.create();
      const isAuthenticated = authClient && await authClient.isAuthenticated();
      
      if (isAuthenticated) {
        await handleAuthenticated();
      } else {
        showView('login');
      }
    } catch (authError) {
      console.error('Auth client initialization error:', authError);
      showView('login');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showView('login');
  }
}

// Show the specified view and hide others
function showView(viewName) {
  currentView = viewName;
  
  Object.keys(views).forEach(key => {
    if (!views[key]) return; // Skip if element not found
    
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
    if (!authClient) {
      console.error('Auth client not initialized');
      return;
    }
    
    const identity = authClient.getIdentity();
    
    // Create agent and actor
    const agent = new HttpAgent({
      identity,
      host: HOST
    });
    
    actor = createActor(CANISTER_ID, { agent });
    
    // Show passwords view and load passwords for current site
    showView('passwords');
    await loadPasswordsForCurrentSite();
    
    // Inform background script that user is authenticated
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: true
    });
  } catch (error) {
    console.error('Authentication error:', error);
    showView('login');
  }
}

// Login with Internet Identity
async function login() {
  try {
    if (!authClient) {
      console.error('Auth client not initialized');
      authClient = await AuthClient.create();
      if (!authClient) {
        throw new Error('Failed to create auth client');
      }
    }
    
    await authClient.login({
      identityProvider: 'https://identity.ic0.app/#authorize',
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
    if (!authClient) {
      console.error('Auth client not initialized');
      return;
    }
    
    await authClient.logout();
    actor = null;
    showView('login');
    
    // Inform background script that user has logged out
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: false
    });
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
    if (!credentialsList) return;
    
    const loadingEl = credentialsList.querySelector('.loading');
    const emptyStateEl = credentialsList.querySelector('.empty-state');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyStateEl) emptyStateEl.classList.add('hidden');
    
    // Remove existing credential items
    document.querySelectorAll('.credential-item').forEach(el => el.remove());
    
    // Get all passwords
    const result = await actor.getAllPasswords();
    
    if ('ok' in result) {
      // Filter for current domain
      currentSiteCredentials = result.ok.filter(
        entry => entry.website && entry.website.includes(currentDomain)
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
          
          if (loadingEl && credentialsList) {
            credentialsList.insertBefore(credItem, loadingEl);
          }
        });
        
        if (emptyStateEl) emptyStateEl.classList.add('hidden');
      } else {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      }
    } else {
      console.error('Failed to load passwords:', result.err);
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
  } catch (error) {
    console.error('Error loading passwords:', error);
  }
}

// Fill credentials on the current page
async function fillCredentialsOnPage(credential) {
  try {
    await chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0] && tabs[0].id) {
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
      }
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
  if (!formEl) return;
  
  const formData = new FormData(formEl);
  
  const passwordEntry = {
    id: crypto.randomUUID(),
    website: formData.get('website') || currentDomain,
    username: formData.get('username') || '',
    password: formData.get('password') || '',
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
  
  const searchInputEl = document.getElementById('search-input');
  if (!searchInputEl) return;
  
  const searchTerm = searchInputEl.value.trim();
  
  if (!searchTerm) {
    await loadPasswordsForCurrentSite();
    return;
  }
  
  try {
    const result = await actor.searchPasswords(searchTerm);
    
    if ('ok' in result) {
      // Update UI with search results
      const credentialsList = document.getElementById('credentials-list');
      if (!credentialsList) return;
      
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
          
          if (loadingEl && credentialsList) {
            credentialsList.insertBefore(credItem, loadingEl);
          }
        });
        
        if (emptyStateEl) emptyStateEl.classList.add('hidden');
      } else {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
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
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', login);
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // Navigation
  const addPasswordBtn = document.getElementById('add-password-btn');
  if (addPasswordBtn) {
    addPasswordBtn.addEventListener('click', () => {
      const formTitle = document.getElementById('form-title');
      if (formTitle) formTitle.textContent = 'Add Password';
      
      const passwordForm = document.getElementById('password-form');
      if (passwordForm) passwordForm.reset();
      
      const websiteField = document.getElementById('website');
      if (websiteField) websiteField.value = currentDomain;
      
      showView('passwordForm');
    });
  }
  
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      showView('passwords');
    });
  }
  
  // Form submission
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', savePassword);
  }
  
  // Password generation
  const generatePasswordBtn = document.getElementById('generate-password');
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.value = generatePassword();
        passwordInput.type = 'text';
      }
    });
  }
  
  // Toggle password visibility
  const togglePasswordBtn = document.getElementById('toggle-password');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
      }
    });
  }
  
  // Search
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchPasswords);
  }
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        searchPasswords();
      }
    });
  }
  
  // View all button
  const viewAllBtn = document.getElementById('view-all-btn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', async () => {
      // Open main web app in a new tab with production canister ID
      const url = `https://4ew3q-eqaaa-aaaad-aaw2a-cai.ic0.app/`;
      await chrome.tabs.create({ url });
    });
  }
}); 