import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { usePageMeta } from '../hooks/usePageMeta';

export function LoginPage() {
  usePageMeta(
    'Login',
    'Sign in or register for Pizza Offers — faster checkout, order history, and account recovery options.'
  );

  const navigate = useNavigate();
  const { user, login, loginWithEmailOtp, apiRequest, registerWithErrorMessage } = useApp();

  useEffect(() => {
    if (!user) return;
    navigate(user.isAdmin ? '/admin' : '/dashboard', { replace: true });
  }, [user, navigate]);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  useEffect(() => {
    setForgotOtp('');
    setForgotOtpSent(false);
  }, [forgotEmail]);
  
  // Register state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loggedIn = await login(loginEmail, loginPassword);

    if (loggedIn) {
      toast.success('Login successful!');
    } else {
      toast.error('Invalid email or password');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    const err = await registerWithErrorMessage(
      registerEmail,
      registerPassword,
      registerName,
      registerPhone,
      registerPasswordConfirm
    );

    if (err === null) {
      toast.success('Registration successful!');
    } else {
      toast.error(err);
    }
  };

  const handleSendForgotOtp = async () => {
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Enter a valid email address');
      return;
    }
    try {
      const data = (await apiRequest('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed }),
      })) as { otp?: string; message?: string };
      setForgotOtpSent(true);
      toast.success(
        data?.otp
          ? `Code sent (dev): ${data.otp}`
          : 'If an account exists for this email, a verification code was sent.'
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code');
    }
  };

  const handleForgotLogin = async () => {
    const { user: loggedInUser, error } = await loginWithEmailOtp(forgotEmail, forgotOtp);
    if (!loggedInUser || error) {
      toast.error(error || 'Could not sign in with this code');
      return;
    }
    toast.success('Logged in successfully');
    navigate('/dashboard');
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome</CardTitle>
          <CardDescription>Login or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="john@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setForgotOpen((v) => !v)}
                    className="text-sm text-orange-600 hover:text-orange-700 underline underline-offset-2"
                  >
                    {forgotOpen ? 'Close forgot password' : 'Forgot password? Login with email code'}
                  </button>
                </div>
                {forgotOpen ? (
                  <div className="rounded-lg border bg-amber-50/60 p-3 space-y-3">
                    <p className="text-xs text-amber-800">
                      Enter your account email. We&apos;ll send a verification code you can use to sign in.
                    </p>
                    <div>
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={handleSendForgotOtp}>
                      Send code
                    </Button>
                    {forgotOtpSent ? (
                      <div>
                        <Label htmlFor="forgot-otp">Verification code</Label>
                        <Input
                          id="forgot-otp"
                          placeholder="6-digit code from email"
                          value={forgotOtp}
                          maxLength={6}
                          onChange={(e) => setForgotOtp(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      className="w-full"
                      disabled={!forgotOtpSent || forgotOtp.trim().length !== 6}
                      onClick={() => {
                        void handleForgotLogin();
                      }}
                    >
                      Verify code and sign in
                    </Button>
                  </div>
                ) : null}
                <Button type="submit" className="w-full">
                  Login
                </Button>
                
               
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="john@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-phone">Phone</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="(416) 555-0100"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-password-confirm">Confirm password</Label>
                  <Input
                    id="register-password-confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    value={registerPasswordConfirm}
                    onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link to="/popularpizza-menu" className="text-sm text-gray-600 hover:text-orange-600">
              Continue as guest
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
