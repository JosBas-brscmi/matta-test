import netlifyIdentity from 'netlify-identity-widget';

export function initIdentity() {
  netlifyIdentity.init({
    APIUrl: `${window.location.origin}/.netlify/identity`,
  });
}

export function openLogin() {
  netlifyIdentity.open('login');
}

export function openSignup() {
  netlifyIdentity.open('signup');
}

export function logout() {
  netlifyIdentity.logout();
}

export function currentUser() {
  return netlifyIdentity.currentUser();
}

export async function currentToken(): Promise<string | null> {
  const user = netlifyIdentity.currentUser();
  if (!user) return null;
  const token = await user.jwt();
  return token ?? null;
}

export function onIdentityChange(cb: () => void) {
  // Close the Identity modal automatically after a successful login
  // so the user can proceed without manually clicking the X.
  netlifyIdentity.on('login', () => {
    try {
      netlifyIdentity.close();
    } catch {
      // ignore
    }
    cb();
  });
  netlifyIdentity.on('logout', cb);
  netlifyIdentity.on('init', cb);
}
