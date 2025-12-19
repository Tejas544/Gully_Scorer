'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // FIX: Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/tournament'); // Redirect if already logged in
      }
    };
    checkSession();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      router.push('/tournament');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-500">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 backdrop-blur-sm">
        <h1 className="text-3xl font-black mb-6 text-center tracking-tight">Admin Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-500 dark:text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-black focus:ring-0 transition font-medium"
              placeholder="admin@gully.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-500 dark:text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-black focus:ring-0 transition font-medium"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition shadow-lg disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Authenticating...' : 'Enter Dugout 🏏'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-xs text-gray-400">
          Only admins can create tournaments. <br/>
          <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => router.push('/tournament')}>View as Guest</span>
        </p>
      </div>
    </div>
  );
}