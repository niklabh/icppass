import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Option "mo:base/Option";

actor PasswordManager {
  // Type definitions
  public type UserId = Principal;
  
  // Password entry type
  public type PasswordEntry = {
    id: Text;
    website: Text;
    username: Text;
    password: Text;
    notes: Text;
    lastUpdated: Int;
  };

  // Error types
  public type Error = {
    #NotAuthorized;
    #NotFound;
    #AlreadyExists;
  };

  // Stable storage for passwords
  private stable var passwordEntriesStable : [(UserId, [(Text, PasswordEntry)])] = [];
  
  // In-memory hashmap for faster access
  private var passwordEntries = HashMap.HashMap<UserId, HashMap.HashMap<Text, PasswordEntry>>(
    10, Principal.equal, Principal.hash
  );
  
  // Initialize the in-memory hashmap from stable storage
  system func preupgrade() {
    passwordEntriesStable := Iter.toArray(
      Iter.map<(UserId, HashMap.HashMap<Text, PasswordEntry>), (UserId, [(Text, PasswordEntry)])>(
        passwordEntries.entries(),
        func (entry: (UserId, HashMap.HashMap<Text, PasswordEntry>)) : (UserId, [(Text, PasswordEntry)]) {
          (entry.0, Iter.toArray(entry.1.entries()))
        }
      )
    );
  };

  system func postupgrade() {
    for ((userId, entries) in passwordEntriesStable.vals()) {
      let userEntries = HashMap.fromIter<Text, PasswordEntry>(
        entries.vals(),
        10,
        Text.equal,
        Text.hash
      );
      passwordEntries.put(userId, userEntries);
    };
    // Clear stable storage after migrating to in-memory
    passwordEntriesStable := [];
  };

  // Helper function to get the caller's principal
  private func getCallerPrincipal() : Principal {
    return Principal.fromActor(PasswordManager);
  };

  // Helper to get user's password entries
  private func getUserEntries(userId: UserId) : HashMap.HashMap<Text, PasswordEntry> {
    switch (passwordEntries.get(userId)) {
      case (null) {
        let newEntries = HashMap.HashMap<Text, PasswordEntry>(10, Text.equal, Text.hash);
        passwordEntries.put(userId, newEntries);
        return newEntries;
      };
      case (?entries) {
        return entries;
      };
    };
  };

  // Create or update a password entry
  public shared(msg) func savePassword(entry: PasswordEntry) : async Result.Result<PasswordEntry, Error> {
    let userId = msg.caller;
    
    // Check if caller is anonymous
    if (Principal.isAnonymous(userId)) {
      return #err(#NotAuthorized);
    };
    
    let userEntries = getUserEntries(userId);
    
    // Create password entry with current timestamp
    let updatedEntry : PasswordEntry = {
      id = entry.id;
      website = entry.website;
      username = entry.username;
      password = entry.password;
      notes = entry.notes;
      lastUpdated = Time.now();
    };
    
    userEntries.put(entry.id, updatedEntry);
    
    return #ok(updatedEntry);
  };

  // Retrieve a specific password entry
  public shared(msg) func getPassword(id: Text) : async Result.Result<PasswordEntry, Error> {
    let userId = msg.caller;
    
    if (Principal.isAnonymous(userId)) {
      return #err(#NotAuthorized);
    };
    
    let userEntries = getUserEntries(userId);
    
    switch (userEntries.get(id)) {
      case (null) { #err(#NotFound) };
      case (?entry) { #ok(entry) };
    };
  };

  // Get all password entries for the authenticated user
  public shared(msg) func getAllPasswords() : async Result.Result<[PasswordEntry], Error> {
    let userId = msg.caller;
    
    if (Principal.isAnonymous(userId)) {
      return #err(#NotAuthorized);
    };
    
    let userEntries = getUserEntries(userId);
    let entries = Iter.toArray(Iter.map(
      userEntries.vals(),
      func (entry: PasswordEntry) : PasswordEntry { entry }
    ));
    
    return #ok(entries);
  };

  // Delete a password entry
  public shared(msg) func deletePassword(id: Text) : async Result.Result<(), Error> {
    let userId = msg.caller;
    
    if (Principal.isAnonymous(userId)) {
      return #err(#NotAuthorized);
    };
    
    let userEntries = getUserEntries(userId);
    
    switch (userEntries.get(id)) {
      case (null) { 
        return #err(#NotFound);
      };
      case (?_) {
        userEntries.delete(id);
        return #ok(());
      };
    };
  };

  // Search for passwords
  public shared(msg) func searchPasswords(searchQuery: Text) : async Result.Result<[PasswordEntry], Error> {
    let userId = msg.caller;
    
    if (Principal.isAnonymous(userId)) {
      return #err(#NotAuthorized);
    };
    
    let userEntries = getUserEntries(userId);
    
    let queryLower = Text.toLowercase(searchQuery);
    
    let matchingEntries = Buffer.Buffer<PasswordEntry>(0);
    
    for (entry in userEntries.vals()) {
      let websiteLower = Text.toLowercase(entry.website);
      let usernameLower = Text.toLowercase(entry.username);
      
      if (Text.contains(websiteLower, #text queryLower) or 
          Text.contains(usernameLower, #text queryLower)) {
        matchingEntries.add(entry);
      };
    };
    
    return #ok(Buffer.toArray(matchingEntries));
  };

  // Public function to check if authenticated
  public shared({ caller }) func whoami() : async Principal {
    return caller;
  };
}
