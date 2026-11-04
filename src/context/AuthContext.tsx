import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'] | 'packing_staff';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: AppRole | null;
  employeeId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to bypass strict typing for Supabase queries
const db = supabase as any;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeStatus, setEmployeeStatus] = useState<'active' | 'inactive' | null>(null);

  const fetchUserRole = async (userId: string, email?: string) => {
    // If it's packing staff, don't query database
    if (userId === 'packing-staff-id' || email?.toLowerCase() === 'packingstaff@gmail.com') {
      setUserRole('packing_staff');
      return;
    }
    const { data } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchEmployeeData = async (userId: string, email?: string) => {
    if (userId === 'packing-staff-id' || email?.toLowerCase() === 'packingstaff@gmail.com') {
      setEmployeeId('packing-staff-emp-id');
      setEmployeeStatus('active');
      return { id: 'packing-staff-emp-id', status: 'active' };
    }
    const { data } = await db
      .from('employees')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setEmployeeId(data.id);
      setEmployeeStatus(data.status as 'active' | 'inactive');
      return data;
    }
    return null;
  };


  useEffect(() => {
    // Check if packing staff session exists in localStorage
    const savedPackingSession = localStorage.getItem('packing_staff_session');
    if (savedPackingSession) {
      try {
        const parsed = JSON.parse(savedPackingSession);
        setUser(parsed.user);
        setSession(parsed.session);
        setUserRole('packing_staff');
        setEmployeeId('packing-staff-emp-id');
        setEmployeeStatus('active');
        setIsLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('packing_staff_session');
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore if local packing staff session is active
        if (localStorage.getItem('packing_staff_session')) return;

        // We no longer set isLoading(true) here because it causes the UI to flicker on session changes.
        // The initial state of isLoading is already true, and we only ever set it to false.

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            try {
              await fetchUserRole(session.user.id, session.user.email);
              const employeeData = await fetchEmployeeData(session.user.id, session.user.email);
              
              // Check if employee is inactive (only for non-admins)
              if (employeeData && employeeData.status === 'inactive') {
                const { data: roleData } = await db
                  .from('user_roles')
                  .select('role')
                  .eq('user_id', session.user.id)
                  .maybeSingle();
                
                // If not super_admin, sign them out
                if (roleData?.role !== 'super_admin') {
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                  setUserRole(null);
                  setEmployeeId(null);
                  setEmployeeStatus(null);
                }
              }
            } catch (err) {
              console.error("Auth state change fetch failed safely:", err);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setUserRole(null);
          setEmployeeId(null);
          setEmployeeStatus(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (localStorage.getItem('packing_staff_session')) return;

      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id, session.user.email);
          const employeeData = await fetchEmployeeData(session.user.id, session.user.email);
          
          // Check if employee is inactive
          if (employeeData && employeeData.status === 'inactive') {
            const { data: roleData } = await db
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            // If not super_admin, sign them out
            if (roleData?.role !== 'super_admin') {
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setUserRole(null);
              setEmployeeId(null);
              setEmployeeStatus(null);
            }
          }
        }
      } catch (err) {
        console.error("Auth session check failed safely:", err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Handle packing staff login with real Supabase Auth + role mapping
      if (email.trim().toLowerCase() === 'packingstaff@gmail.com' && password === 'Packing@Staff') {
        try {
          let authUser: any = null;
          let authSession: any = null;

          // 1. Try signing in with Supabase Auth
          const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authData?.user && authData?.session) {
            authUser = authData.user;
            authSession = authData.session;
          } else if (signInErr) {
            // 2. Auto sign-up packing staff user if not present in auth.users
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email,
              password,
            });

            if (signUpData?.user) {
              authUser = signUpData.user;
              authSession = signUpData.session;
            }
          }

          if (authUser) {
            // 3. Ensure role 'packing_staff' exists in user_roles table for Supabase RLS
            try {
              await db.from('user_roles').upsert(
                {
                  user_id: authUser.id,
                  role: 'packing_staff',
                },
                { onConflict: 'user_id' }
              );
            } catch (roleErr) {
              console.warn('Could not upsert user_roles for packing_staff:', roleErr);
            }

            localStorage.setItem('packing_staff_session', JSON.stringify({ user: authUser, session: authSession }));
            setUser(authUser);
            setSession(authSession);
            setUserRole('packing_staff');
            setEmployeeId('packing-staff-emp-id');
            setEmployeeStatus('active');
            return { error: null };
          }
        } catch (err) {
          console.warn('Supabase auth failed for packing staff, falling back to local session:', err);
        }

        // Fallback mock session if Supabase Auth network/signup is unavailable
        const mockUser = {
          id: 'packing-staff-id',
          email: 'packingstaff@gmail.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as any;
        const mockSession = {
          access_token: 'packing-staff-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'packing-staff-refresh-token',
          user: mockUser,
        } as any;

        localStorage.setItem('packing_staff_session', JSON.stringify({ user: mockUser, session: mockSession }));
        setUser(mockUser);
        setSession(mockSession);
        setUserRole('packing_staff');
        setEmployeeId('packing-staff-emp-id');
        setEmployeeStatus('active');
        return { error: null };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }

      // After successful login, check employee status
      if (data.user) {
        // First get the user role
        const { data: roleData } = await db
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role);
        }

        // If not super_admin, check employee status
        if (roleData?.role !== 'super_admin') {
          const { data: employeeData } = await db
            .from('employees')
            .select('status')
            .eq('user_id', data.user.id)
            .maybeSingle();

          // If employee exists and is inactive, sign them out
          if (employeeData && employeeData.status === 'inactive') {
            await supabase.auth.signOut();
            return { 
              error: new Error('Your account has been deactivated. Please contact your administrator.') 
            };
          }
        }
      }
      
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('packing_staff_session');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setEmployeeId(null);
    setEmployeeStatus(null);
  };

  const hasRole = (role: AppRole) => {
    if (!userRole) return false;
    if (userRole === 'super_admin') return true;
    return userRole === role;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session,
        isLoading, 
        isAuthenticated: !!session, 
        userRole,
        employeeId,
        signIn, 
        signOut, 
        hasRole 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
