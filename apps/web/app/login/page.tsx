import type { JSX } from 'react';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage(): JSX.Element {
  return (
    <main className="login-wrap">
      <LoginForm />
    </main>
  );
}
