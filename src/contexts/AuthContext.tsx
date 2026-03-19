import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'registrador' | 'tecnico' | 'auditor';

interface UserProfile {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  userRole: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isRegistrador: boolean;
  isTecnico: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache keys for persisting auth state
const AUTH_CACHE_KEY = 'biosolve_auth_cache';

interface AuthCache {
  userProfile: UserProfile | null;
  userRole: AppRole | null;
  userId: string | null;
}

function getAuthCache(): AuthCache | null {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setAuthCache(cache: AuthCache) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

function clearAuthCache() {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Try to restore from cache for instant display
  const cachedAuth = getAuthCache();
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(cachedAuth?.userProfile ?? null);
  const [userRole, setUserRole] = useState<AppRole | null>(cachedAuth?.userRole ?? null);
  const [loading, setLoading] = useState(true);
  
  // Track if we've done initial load
  const initialLoadDoneRef = useRef(false);
  const fetchingRef = useRef(false);

  const fetchUserProfileAndRole = async (userId: string) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Fetch both in parallel
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('usuarios').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      const profile = profileRes.data;
      const role = roleRes.data?.role as AppRole | null;

      // Only update if we got data (don't clear on network errors)
      if (!profileRes.error && profile) {
        setUserProfile(profile);
      }
      if (!roleRes.error) {
        setUserRole(role);
      }
      
      // Cache the data for quick restore
      if (profile || role) {
        setAuthCache({
          userProfile: profile ?? userProfile,
          userRole: role ?? userRole,
          userId,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Don't clear existing data on error - keep showing cached data
    } finally {
      fetchingRef.current = false;
      if (!initialLoadDoneRef.current) {
        setLoading(false);
        initialLoadDoneRef.current = true;
      }
    }
  };

  useEffect(() => {
    // Check for cached auth immediately
    const cached = getAuthCache();
    if (cached?.userProfile && cached?.userRole) {
      setUserProfile(cached.userProfile);
      setUserRole(cached.userRole);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // If we have cached data for this user, show immediately
          const cached = getAuthCache();
          if (cached && cached.userId === session.user.id && cached.userProfile) {
            setUserProfile(cached.userProfile);
            setUserRole(cached.userRole);
            setLoading(false);
            initialLoadDoneRef.current = true;
          }
          
          // Fetch fresh data in background
          setTimeout(() => fetchUserProfileAndRole(session.user.id), 0);
        } else {
          setUserProfile(null);
          setUserRole(null);
          clearAuthCache();
          setLoading(false);
          initialLoadDoneRef.current = true;
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use cached data if available
        const cached = getAuthCache();
        if (cached && cached.userId === session.user.id && cached.userProfile) {
          setUserProfile(cached.userProfile);
          setUserRole(cached.userRole);
          setLoading(false);
          initialLoadDoneRef.current = true;
        }
        
        fetchUserProfileAndRole(session.user.id);
      } else {
        clearAuthCache();
        setLoading(false);
        initialLoadDoneRef.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUserProfile(null);
      setUserRole(null);
      setUser(null);
      setSession(null);
      clearAuthCache();
      
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userProfile,
    userRole,
    loading,
    signIn,
    signOut,
    isAdmin: userRole === 'admin',
    isRegistrador: userRole === 'registrador',
    isTecnico: userRole === 'tecnico',
    isAuditor: userRole === 'auditor',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
