// auth.js - Multi-User Clerk & Admin Access Control

const USERS_KEY = 'pos_current_session';

const USERS_DATABASE = [
  { username: '', pin: '1234', role: 'admin', fullName: 'KOFI (Administrator)' },
  { username: '', pin: '0000', role: 'cashier1', fullName: 'SAM' },
  { username: '', pin: '1111', role: 'cashier2', fullName: 'FRANK' }
];

export function authenticateUser(identifier, pin) {
  const users = getStoredUsers();
  const foundUser = users.find(u => 
    (u.username === identifier || u.role === identifier) && u.pin === pin
  );

  if (foundUser) {
    const sessionData = {
      username: foundUser.username,
      role: foundUser.role,
      fullName: foundUser.fullName,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(sessionData));
    return { success: true, user: sessionData };
  }

  return { success: false, message: 'Invalid credentials or PIN code.' };
}

export function getCurrentSession() {
  const session = localStorage.getItem(USERS_KEY);
  return session ? JSON.parse(session) : null;
}

export function terminateSession() {
  localStorage.removeItem(USERS_KEY);
}

export function getStoredUsers() {
 
  localStorage.setItem('pos_users_db', JSON.stringify(USERS_DATABASE));
  return USERS_DATABASE;
}