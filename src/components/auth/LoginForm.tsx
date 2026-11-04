import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import reservoirLogo from '@/assets/reservoir-logo.png';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Helper to bypass strict typing
const db = supabase as any;

interface LoginFormProps {
  title?: string;
  description?: string;
  requiredRoles?: AppRole[];
  alternateLogin?: {
    label: string;
    to: string;
  };
}

const playLoginSound = () => {
  // Sound removed as requested
};

export function LoginForm({
  title = 'ReservoirApp',
  description = 'Geofencing-based water management system',
  requiredRoles,
  alternateLogin,
}: LoginFormProps) {
  const { signIn, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signInEmail);
      passwordSchema.parse(signInPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(signInEmail, signInPassword);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('deactivated') || error.message.includes('inactive')) {
        toast.error('Your account has been deactivated. Please contact your administrator.');
      } else {
        toast.error(error.message);
      }
    } else {
      // Direct redirect for packing staff bypass
      if (signInEmail.trim().toLowerCase() === 'packingstaff@gmail.com') {
        playLoginSound();
        toast.success('Welcome back, Packing Staff!');
        navigate('/packing/bills', { replace: true });
        setIsSubmitting(false);
        return;
      }

      // Enforce role for portal-specific logins (server-side RLS should also protect pages)
      if (requiredRoles && requiredRoles.length > 0) {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (authErr || !userId) {
          await signOut();
          toast.error('Login failed: unable to verify user');
          setIsSubmitting(false);
          return;
        }

        const { data: roleData, error: roleErr } = await db
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        const role = roleData?.role as AppRole | undefined;
        if (roleErr || !role) {
          await signOut();
          toast.error('Login failed: unable to verify your role');
          setIsSubmitting(false);
          return;
        }

        if (!requiredRoles.includes(role)) {
          // Instead of blocking, redirect to the correct portal for that role.
          if (role === 'fisheries_association') {
            toast.info('Redirecting to Fisheries Association portal…');
            navigate('/association/bills/new', { replace: true });
          } else if (role === 'packing_staff') {
            toast.info('Redirecting to Packing portal…');
            navigate('/packing/bills', { replace: true });
          } else {
            toast.info('Redirecting to Admin/Employee portal…');
            navigate('/admin/association-bills', { replace: true });
          }
          setIsSubmitting(false);
          return;
        }
      }

      playLoginSound();
      toast.success('Welcome back!');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-light via-background to-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-light via-background to-secondary p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-water/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md relative animate-slide-up shadow-elevated border-border/50 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-water" />
            <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-glow">
              <img src={reservoirLogo} alt="Reservoir" className="h-12 w-12 invert" />
            </div>
          </div>
          <CardTitle className="font-display text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="Enter your email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  className="bg-background/50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-water text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {alternateLogin && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link
                to={alternateLogin.to}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {alternateLogin.label}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
