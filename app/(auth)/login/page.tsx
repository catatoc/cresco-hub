import { Suspense } from 'react';
import { LoginExperience } from '@/components/auth/login-experience';

export const metadata = {
  title: 'crescō · entrar',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginExperience />
    </Suspense>
  );
}
