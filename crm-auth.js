const CREATE_USER_ENDPOINT = 'https://api-livid-phi-43.vercel.app/api/create-user';
const LOGIN_ENDPOINT = 'https://api-livid-phi-43.vercel.app/api/login';

async function createUserWithCRM(email) {
  const res = await fetch(CREATE_USER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data.user;
}

async function signInWithCRM(email) {
  const res = await fetch(LOGIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  const user = data.user;
  await chrome.storage.local.set({
    crm_user_email: user.email,
    crm_user_id: user.id,
    crm_user_name: user.name || '',
    crm_signed_in_at: Date.now(),
  });

  return user;
}

async function getSignedInUser() {
  const { crm_user_email, crm_user_id, crm_user_name } = await chrome.storage.local.get([
    'crm_user_email', 'crm_user_id', 'crm_user_name',
  ]);

  return crm_user_email
    ? { email: crm_user_email, id: crm_user_id, name: crm_user_name }
    : null;
}

async function signOut() {
  await chrome.storage.local.remove([
    'crm_user_email',
    'crm_user_id',
    'crm_user_name',
    'crm_signed_in_at',
  ]);
}

function openModal() {
  const overlay = document.getElementById('crm-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('crm-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  clearError();
}

function showError(msg) {
  const errorDiv = document.getElementById('crm-error');
  if (errorDiv) { errorDiv.textContent = msg; errorDiv.style.display = 'block'; }
}

function clearError() {
  const errorDiv = document.getElementById('crm-error');
  if (errorDiv) { errorDiv.textContent = ''; errorDiv.style.display = 'none'; }
}

function showSignedInUI(user) {
  const card = document.getElementById('crm-signed-in-card');
  const emailDisplay = document.getElementById('crm-user-email-display');
  const loginBtn = document.getElementById('crm-login-btn');

  if (card) card.style.display = 'flex';
  if (emailDisplay) emailDisplay.textContent = user.email;
  if (loginBtn) {
    loginBtn.textContent = user.email.substring(0, 14) + (user.email.length > 14 ? '..' : '');
    loginBtn.classList.add('logged-in');
  }

  closeModal();
}

function showSignedOutUI() {
  const card = document.getElementById('crm-signed-in-card');
  const loginBtn = document.getElementById('crm-login-btn');

  if (card) card.style.display = 'none';
  if (loginBtn) {
    loginBtn.textContent = 'Login';
    loginBtn.classList.remove('logged-in');
  }
}

function switchToSignin() {
  document.getElementById('crm-signin-mode').style.display = 'block';
  document.getElementById('crm-signup-mode').style.display = 'none';
  clearError();
}

function switchToSignup() {
  document.getElementById('crm-signin-mode').style.display = 'none';
  document.getElementById('crm-signup-mode').style.display = 'block';
  clearError();
}

async function initCRMAuth() {
  const loginBtn = document.getElementById('crm-login-btn');
  const modalClose = document.getElementById('crm-modal-close');
  const overlay = document.getElementById('crm-modal-overlay');
  const signinBtn = document.getElementById('crm-signin-btn');
  const signupBtn = document.getElementById('crm-signup-btn');
  const emailInput = document.getElementById('crm-email');
  const signupEmailInput = document.getElementById('crm-signup-email');
  const switchToSignupLink = document.getElementById('crm-switch-to-signup');
  const switchToSigninLink = document.getElementById('crm-switch-to-signin');
  const signoutLink = document.getElementById('crm-signout-link');

  if (!overlay) return;

  const user = await getSignedInUser();
  if (user) { showSignedInUI(user); } else { showSignedOutUI(); }

  if (loginBtn) {
    loginBtn.addEventListener('click', openModal);
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  if (switchToSignupLink) {
    switchToSignupLink.addEventListener('click', (e) => { e.preventDefault(); switchToSignup(); });
  }

  if (switchToSigninLink) {
    switchToSigninLink.addEventListener('click', (e) => { e.preventDefault(); switchToSignin(); });
  }

  if (signinBtn) {
    signinBtn.addEventListener('click', async () => {
      clearError();
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) { showError('Enter your email'); return; }

      signinBtn.disabled = true;
      signinBtn.textContent = 'Signing in...';

      try {
        const user = await signInWithCRM(email);
        showSignedInUI(user);
      } catch (e) {
        showError(e.message);
      } finally {
        signinBtn.disabled = false;
        signinBtn.textContent = 'Sign in';
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      clearError();
      const email = signupEmailInput ? signupEmailInput.value.trim() : '';
      if (!email) { showError('Enter your email'); return; }

      signupBtn.disabled = true;
      signupBtn.textContent = 'Creating account...';

      try {
        const user = await createUserWithCRM(email);
        showSignedInUI(user);
      } catch (e) {
        showError(e.message);
      } finally {
        signupBtn.disabled = false;
        signupBtn.textContent = 'Create Account';
      }
    });
  }

  if (signoutLink) {
    signoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut();
      showSignedOutUI();
      switchToSignin();
    });
  }
}

document.addEventListener('DOMContentLoaded', initCRMAuth);
