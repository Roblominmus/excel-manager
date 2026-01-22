'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/login');
    };

    handleLogout();
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Signing out...</p>
    </div>
  );
}
