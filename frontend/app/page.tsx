import { AuthContext } from '@/components/AuthContext';
import WhongNaiMor from '@/components/WhongNaiMor';

export default function Page() {
  // No viewerRole prop: the role comes from users.is_mod via /user/current/fetch.
  // Pass viewerRole="moderator" | "guest" to force a view while demoing.
  return (
    <AuthContext>
      <WhongNaiMor accentColor="#7d50a8" laneMode="single" />
    </AuthContext>
  );
}
