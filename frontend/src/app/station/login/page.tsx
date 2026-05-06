import { redirect } from 'next/navigation';
export default function StationLogin() {
  redirect('/?role=station');
}
