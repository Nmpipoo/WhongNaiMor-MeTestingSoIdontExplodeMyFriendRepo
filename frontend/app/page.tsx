import { AuthContext } from '@/components/AuthContext';
import WhongNaiMor from '@/components/WhongNaiMor';

export default function Page() {
  return <AuthContext>
    <WhongNaiMor accentColor="#7d50a8" viewerRole="student" laneMode="single" />;
  </AuthContext>
}
