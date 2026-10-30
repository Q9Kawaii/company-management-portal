import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }

    if (!data) return null;

    // Expose both the raw snake_case columns and camelCase aliases, because
    // components across the app read either form.
    return {
      ...data,
      id: data.id,
      authUserId: data.id,
      user_id: data.user_id,
      userId: data.user_id,
      name: data.name ||  '',
      email: data.email || authUser.email || '',
      role: data.role,
      department: data.department ?? null,
      is_active: data.is_active,
      isActive: data.is_active === true,
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!currentSession?.user) {
        setSession(null);
        setUser(null);
        return null;
      }

      const profile = await fetchProfile(currentSession.user);

      setSession(currentSession);

      if (!profile || !profile.isActive) {
        setUser(null);
        return null;
      }

      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      return null;
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          const profile = await fetchProfile(currentSession.user);

          if (!mounted) return;

          if (profile?.isActive) {
            setUser(profile);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);

        if (mounted) {
          setUser(null);
          setSession(null);
          setAuthError('Unable to load your account. Please try again.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);

      if (event === 'SIGNED_OUT' || !currentSession?.user) {
        setUser(null);
        setAuthError('');
        setLoading(false);
        return;
      }

      // Initialization already loads the current session.
      // TOKEN_REFRESHED does not require another profile query.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        return;
      }

      // Defer Supabase queries to avoid performing them inside
      // the auth state-change callback.
      setTimeout(async () => {
        if (!mounted) return;

        try {
          const profile = await fetchProfile(currentSession.user);

          if (!mounted) return;

          if (profile?.isActive) {
            setUser(profile);
            setAuthError('');
          } else {
            setUser(null);
            setAuthError('Your account is inactive or unavailable.');
          }
        } catch (error) {
          console.error('Failed to load authenticated profile:', error);

          if (mounted) {
            setUser(null);
            setAuthError('Unable to load your account details.');
          }
        } finally {
          if (mounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(
    async ({ userId, password }) => {
      setAuthError('');

      if (!userId?.trim() || !password) {
        const message = 'Enter your company ID and password.';
        setAuthError(message);
        return { success: false, error: message };
      }

      setLoading(true);

      try {
        const normalizedUserId = userId.trim().toUpperCase();

        // Authenticate using the server-side company-ID lookup.
        // The Edge Function verifies the actual password through
        // Supabase Auth and returns the resulting session.
        const { data, error } = await supabase.functions.invoke(
          'company-login',
          {
            body: {
              userId: normalizedUserId,
              password,
            },
          }
        );

        if (error) {
          console.error('Company login request failed:', error);

          let message = 'Unable to contact the login service. Please try again.';

          // Supabase FunctionsHttpError may include the response body.
          if (error.context && typeof error.context.json === 'function') {
            try {
              const responseBody = await error.context.json();

              if (responseBody?.error) {
                message = responseBody.error;
              }
            } catch {
              // Keep the safe default message.
            }
          }

          setAuthError(message);
          return { success: false, error: message };
        }

        if (!data?.session?.access_token || !data?.session?.refresh_token) {
          const message =
            data?.error || 'The login service returned an invalid session.';

          setAuthError(message);
          return { success: false, error: message };
        }

        // Establish the session in the frontend Supabase client.
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

        if (sessionError) {
          console.error('Failed to establish Supabase session:', sessionError);
          throw sessionError;
        }

        const authenticatedUser = sessionData.user || data.session.user;

        if (!authenticatedUser?.id) {
          await supabase.auth.signOut();

          const message = 'Unable to identify the authenticated account.';
          setAuthError(message);
          return { success: false, error: message };
        }

        // Fetch the profile only after authentication has succeeded.
        const profile = await fetchProfile(authenticatedUser);

        if (!profile || !profile.isActive) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);

          const message =
            'Your account is inactive or unavailable. Contact your administrator.';

          setAuthError(message);
          return { success: false, error: message };
        }

        setSession(sessionData.session);
        setUser(profile);
        setAuthError('');

        return {
          success: true,
          user: profile,
        };
      } catch (error) {
        console.error('Login failed:', error);

        const message =
          error?.message || 'Unable to sign in. Please try again.';

        setAuthError(message);
        setUser(null);

        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile]
  );

  const logout = useCallback(async () => {
    setAuthError('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout failed:', error);

      const message = 'Unable to sign out. Please try again.';
      setAuthError(message);

      return { success: false, error: error.message };
    }

    setUser(null);
    setSession(null);

    return { success: true };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError('');
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      authError,
      isAuthenticated: Boolean(session && user && user.isActive),
      login,
      logout,
      refreshUser,
      clearAuthError,
    }),
    [
      user,
      session,
      loading,
      authError,
      login,
      logout,
      refreshUser,
      clearAuthError,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}