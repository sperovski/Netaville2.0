import {redirect} from 'next/navigation';
import {readSession} from '@/lib/auth';
import {LoginForm} from './LoginForm';

export const metadata = {title: 'Sign in · Netaville Admin'};

export default async function LoginPage() {
  if ((await readSession()) !== null) {
    redirect('/dashboard');
  }
  return <LoginForm />;
}
