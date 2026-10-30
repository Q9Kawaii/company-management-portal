import { supabase } from '../lib/supabase';

const PROFILE_FIELDS =
  'id, user_id, name, email, role, department, is_active, created_at, updated_at';

const normalizeProfile = (profile) => {
  if (!profile) return null;

  return {
    ...profile,
    userId: profile.user_id,
    authUserId: profile.id,
    isActive: profile.is_active !== false,
    createdAt: profile.created_at,
  };
};

/**
 * Sign in using the company ID and password.
 * The company ID is resolved to an email before Supabase authentication.
 */
export async function login({ userId, password }) {
  if (!userId?.trim() || !password) {
    throw new Error('Please enter your user ID and password.');
  }

  const normalizedUserId = userId.trim().toUpperCase();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('user_id', normalizedUserId)
    .maybeSingle();

  if (profileError) {
    console.error('User lookup failed:', profileError);
    throw new Error('Unable to verify your user ID. Please try again.');
  }

  if (!profile) {
    throw new Error('Invalid user ID or password.');
  }

  if (profile.is_active === false) {
    throw new Error(
      'Your account has been deactivated. Please contact your administrator.'
    );
  }

  if (!profile.email) {
    throw new Error('Your account does not have an email address configured.');
  }

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError) {
    console.error('Supabase sign-in failed:', signInError);
    throw new Error('Invalid user ID or password.');
  }

  if (!data.user) {
    throw new Error('Sign-in failed. Please try again.');
  }

  if (data.user.id !== profile.id) {
    await supabase.auth.signOut();
    throw new Error('Authentication verification failed.');
  }

  const { data: authenticatedProfile, error: authenticatedProfileError } =
    await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', data.user.id)
      .maybeSingle();

  if (authenticatedProfileError || !authenticatedProfile) {
    await supabase.auth.signOut();
    throw new Error('Unable to load your account profile.');
  }

  if (authenticatedProfile.is_active === false) {
    await supabase.auth.signOut();
    throw new Error(
      'Your account has been deactivated. Please contact your administrator.'
    );
  }

  return {
    session: data.session,
    user: normalizeProfile(authenticatedProfile),
  };
}

/**
 * Sign out the current user.
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign-out failed:', error);
    throw new Error('Unable to sign out. Please try again.');
  }

  return true;
}

/**
 * Get the profile associated with the current Supabase session.
 */
export async function getCurrentUser() {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Unable to retrieve authenticated user:', authError);
    throw authError;
  }

  if (!authUser) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    console.error('Unable to load user profile:', profileError);
    throw profileError;
  }

  if (!profile) return null;

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    throw new Error(
      'Your account has been deactivated. Please contact your administrator.'
    );
  }

  return normalizeProfile(profile);
}

/**
 * Fetch the profile associated with a Supabase Auth UUID.
 */
export async function getUserProfile(authUserId) {
  if (!authUserId) {
    throw new Error('An authenticated user ID is required.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('Unable to fetch user profile:', error);
    throw error;
  }

  return normalizeProfile(data);
}

/**
 * Listen for Supabase authentication changes.
 */
export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (typeof callback === 'function') {
      callback({
        event,
        session,
        authUser: session?.user || null,
      });
    }
  });

  return subscription;
}

/**
 * Restore the current Supabase session.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Unable to retrieve session:', error);
    throw error;
  }

  return data.session;
}

/**
 * Request a password reset email.
 */
export async function requestPasswordReset(email) {
  if (!email?.trim()) {
    throw new Error('Please enter your email address.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase()
  );

  if (error) {
    console.error('Password reset request failed:', error);
    throw new Error('Unable to request a password reset. Please try again.');
  }

  return true;
}

/**
 * Update the password for the currently authenticated user.
 */
export async function updatePassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Your password must contain at least 8 characters.');
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Password update failed:', error);
    throw new Error('Unable to update your password. Please try again.');
  }

  return data.user;
}