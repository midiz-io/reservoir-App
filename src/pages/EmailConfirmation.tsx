import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Supabase automatically processes the email confirmation from the URL hash
        // We just need to check if a session was created
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Email confirmed successfully - Supabase automatically confirmed it
          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting to login...');
          toast.success('Email confirmed successfully!');
          
          // Sign out to clear the session (user needs to log in with password)
          await supabase.auth.signOut();
          
          // Redirect to login page after 2 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
        } else {
          // Wait a bit for Supabase to process the hash
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              setStatus('success');
              setMessage('Email confirmed successfully! Redirecting to login...');
              toast.success('Email confirmed successfully!');
              await supabase.auth.signOut();
              setTimeout(() => {
                navigate('/login', { replace: true });
              }, 2000);
            } else {
              setStatus('error');
              setMessage('Failed to confirm email. The link may have expired or already been used.');
              toast.error('Failed to confirm email');
            }
          }, 1000);
        }
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to confirm email. The link may have expired.');
        toast.error('Failed to confirm email');
      }
    };

    confirmEmail();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-light via-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Confirmation</CardTitle>
          <CardDescription>Please wait while we confirm your email address</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <p className="text-success font-medium mb-4">{message}</p>
              <Button onClick={() => navigate('/login', { replace: true })}>
                Go to Login
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium mb-4">{message}</p>
              <Button onClick={() => navigate('/login', { replace: true })}>
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

