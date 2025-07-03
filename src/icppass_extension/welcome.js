import { AuthClient } from '@dfinity/auth-client';

document.addEventListener('DOMContentLoaded', function() {
  // Set canister IDs from production
  const BACKEND_CANISTER_ID = "4rrk5-fyaaa-aaaad-aawzq-cai";
  const FRONTEND_CANISTER_ID = "4ew3q-eqaaa-aaaad-aaw2a-cai";
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Initialize all event listeners
  function initializeEventListeners() {
    // Handle login with Internet Identity
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', handleLogin);
    }
    
    // Handle webapp button
    const webappBtn = document.getElementById('webapp-btn');
    if (webappBtn) {
      webappBtn.addEventListener('click', handleWebappClick);
    }
  }
  
  // Handle login with Internet Identity
  async function handleLogin() {
    try {
      // Create an auth client
      const authClient = await AuthClient.create();
      
      if (!authClient) {
        console.error('Failed to create auth client');
        return;
      }
      
      // Open Internet Identity in a new window/tab
      await authClient.login({
        identityProvider: "https://identity.ic0.app/#authorize",
        onSuccess: () => {
          // After successful login:
          
          // 1. Notify the background script of authentication
          chrome.runtime.sendMessage({ 
            action: 'authStateChanged', 
            isAuthenticated: true 
          });
          
          // 2. Open the extension popup
          chrome.runtime.sendMessage({ 
            action: 'openPopup' 
          });
          
          // 3. Open the popup.html in this tab
          window.location.href = chrome.runtime.getURL('popup.html');
        },
        onError: (error) => {
          console.error('Login error:', error);
        }
      });
    } catch (error) {
      console.error('Login process error:', error);
    }
  }
  
  // Handle webapp button click
  function handleWebappClick() {
    try {
      // Open the production frontend canister
      const url = `https://${FRONTEND_CANISTER_ID}.ic0.app/`;
      chrome.tabs.create({ url });
    } catch (error) {
      console.error('Error opening web app:', error);
    }
  }
}); 