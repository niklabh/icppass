import { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { icppass_backend } from 'declarations/icppass_backend';
import { createActor } from 'declarations/icppass_backend';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null);
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPassword, setCurrentPassword] = useState(null);

  // New password entry template
  const emptyPassword = {
    id: '',
    website: '',
    username: '',
    password: '',
    notes: '',
    lastUpdated: 0
  };

  // Initialize Auth Client
  useEffect(() => {
    const initAuth = async () => {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);

        // Check if already authenticated
        if (await client.isAuthenticated()) {
          handleAuthenticated(client);
        }
      } catch (err) {
        console.error("Error initializing auth client", err);
        setError("Failed to initialize authentication. Please try again.");
      }
    };

    initAuth();
  }, []);

  // Handle successful authentication
  const handleAuthenticated = async (client) => {
    const identity = client.getIdentity();
    setIdentity(identity);
    setIsAuthenticated(true);

    // Create an authenticated actor
    const agent = new HttpAgent({ identity });
    
    // When developing locally, we need to disable verification
    if (process.env.NODE_ENV !== "production") {
      agent.fetchRootKey().catch(err => {
        console.warn("Unable to fetch root key. Check your local replica is running");
        console.error(err);
      });
    }

    const authenticatedActor = createActor(process.env.CANISTER_ID_ICPPASS_BACKEND || "4rrk5-fyaaa-aaaad-aawzq-cai", {
      agent,
    });
    
    setActor(authenticatedActor);
    
    // Load passwords after authentication
    loadPasswords(authenticatedActor);
  };

  // Login with Internet Identity
  const login = async () => {
    if (authClient) {
      await authClient.login({
        identityProvider: process.env.DFX_NETWORK === "ic" 
          ? "https://identity.ic0.app/#authorize" 
          : `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943/`,
        onSuccess: () => {
          handleAuthenticated(authClient);
        },
        onError: (error) => {
          console.error("Login failed", error);
          setError("Login failed. Please try again.");
        }
      });
    }
  };

  // Logout
  const logout = async () => {
    if (authClient) {
      await authClient.logout();
      setIsAuthenticated(false);
      setIdentity(null);
      setActor(null);
      setPasswords([]);
    }
  };

  // Load all passwords
  const loadPasswords = async (passwordActor) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await (passwordActor || actor).getAllPasswords();
      
      if ('ok' in result) {
        setPasswords(result.ok);
      } else {
        console.error("Failed to load passwords:", result.err);
        setError("Failed to load your passwords. Please try again.");
      }
    } catch (err) {
      console.error("Error loading passwords:", err);
      setError("An error occurred while loading your passwords.");
    } finally {
      setLoading(false);
    }
  };

  // Save a password entry
  const savePassword = async (passwordEntry) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await actor.savePassword({
        ...passwordEntry,
        id: passwordEntry.id || crypto.randomUUID()
      });
      
      if ('ok' in result) {
        await loadPasswords();
        setCurrentView('list');
      } else {
        console.error("Failed to save password:", result.err);
        setError("Failed to save the password. Please try again.");
      }
    } catch (err) {
      console.error("Error saving password:", err);
      setError("An error occurred while saving the password.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a password entry
  const deletePassword = async (id) => {
    if (!window.confirm("Are you sure you want to delete this password?")) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await actor.deletePassword(id);
      
      if ('ok' in result) {
        await loadPasswords();
      } else {
        console.error("Failed to delete password:", result.err);
        setError("Failed to delete the password. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting password:", err);
      setError("An error occurred while deleting the password.");
    } finally {
      setLoading(false);
    }
  };

  // Search passwords
  const searchPasswords = async () => {
    if (!searchTerm.trim()) {
      await loadPasswords();
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await actor.searchPasswords(searchTerm);
      
      if ('ok' in result) {
        setPasswords(result.ok);
      } else {
        console.error("Failed to search passwords:", result.err);
        setError("Failed to search your passwords. Please try again.");
      }
    } catch (err) {
      console.error("Error searching passwords:", err);
      setError("An error occurred while searching your passwords.");
    } finally {
      setLoading(false);
    }
  };

  // Handle password form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const passwordEntry = {
      id: currentPassword?.id || '',
      website: formData.get('website'),
      username: formData.get('username'),
      password: formData.get('password'),
      notes: formData.get('notes'),
      lastUpdated: currentPassword?.lastUpdated || 0
    };
    
    savePassword(passwordEntry);
  };

  // Edit a password
  const editPassword = (password) => {
    setCurrentPassword(password);
    setCurrentView('edit');
  };

  // Format date from nanoseconds
  const formatDate = (nanoseconds) => {
    if (!nanoseconds) return '';
    // Convert nanoseconds to milliseconds
    const milliseconds = Number(nanoseconds) / 1000000;
    return new Date(milliseconds).toLocaleString();
  };

  // Generate a secure password
  const generatePassword = (length = 16) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  // Render the password list view
  const renderPasswordList = () => (
    <div className="password-list">
      <div className="list-header">
        <h2>Your Passwords</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search passwords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchPasswords()}
          />
          <button onClick={searchPasswords}>Search</button>
          <button onClick={() => loadPasswords()}>Reset</button>
        </div>
        <button className="add-btn" onClick={() => {
          setCurrentPassword(emptyPassword);
          setCurrentView('add');
        }}>Add New Password</button>
      </div>
      
      {loading ? (
        <div className="loading">Loading passwords...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : passwords.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any saved passwords yet.</p>
          <button onClick={() => {
            setCurrentPassword(emptyPassword);
            setCurrentView('add');
          }}>Add Your First Password</button>
        </div>
      ) : (
        <table className="password-table">
          <thead>
            <tr>
              <th>Website</th>
              <th>Username</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {passwords.map((password) => (
              <tr key={password.id}>
                <td>{password.website}</td>
                <td>{password.username}</td>
                <td>{formatDate(password.lastUpdated)}</td>
                <td className="actions">
                  <button onClick={() => editPassword(password)}>View/Edit</button>
                  <button onClick={() => deletePassword(password.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render the password form view (add/edit)
  const renderPasswordForm = () => {
    const isEdit = currentView === 'edit';
    
    return (
      <div className="password-form">
        <h2>{isEdit ? 'Edit Password' : 'Add New Password'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              required
              defaultValue={currentPassword?.website || ''}
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              defaultValue={currentPassword?.username || ''}
            />
          </div>
          <div className="form-group password-input">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              defaultValue={currentPassword?.password || ''}
            />
            <button 
              type="button" 
              className="generate-btn"
              onClick={() => {
                document.getElementById('password').value = generatePassword();
                document.getElementById('password').type = "text";
              }}
            >
              Generate
            </button>
            <button
              type="button"
              className="toggle-btn"
              onClick={() => {
                const input = document.getElementById('password');
                input.type = input.type === 'password' ? 'text' : 'password';
              }}
            >
              Show/Hide
            </button>
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={currentPassword?.notes || ''}
            ></textarea>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">Save</button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setCurrentView('list')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Render login view
  const renderLogin = () => (
    <div className="login-view">
      <div className="logo-container">
        <img src="/logo2.svg" alt="ICPPass Logo" />
        <h1>ICPPass</h1>
        <p>Your secure password manager on the Internet Computer</p>
      </div>
      <div className="login-box">
        <h2>Welcome to ICPPass</h2>
        <p>Secure your passwords with the power of Internet Computer</p>
        <button className="login-btn" onClick={login}>
          Login with Internet Identity
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="app">
      {!isAuthenticated ? (
        renderLogin()
      ) : (
        <>
          <header className="app-header">
            <div className="logo">
              <img src="/logo2.svg" alt="ICPPass Logo" className="logo-img" />
              <h1>ICPPass</h1>
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </header>
          
          <main className="app-main">
            {currentView === 'list' ? renderPasswordList() : renderPasswordForm()}
          </main>
          
          <footer className="app-footer">
            <p>ICPPass - Secure Password Manager on Internet Computer Protocol</p>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
