import { redirect } from 'next/navigation';
export default function UserLogin() {
  redirect('/?role=user');
}
