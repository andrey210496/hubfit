import { Routes, Route, Navigate } from 'react-router-dom';
import { MemberAuthProvider } from '@/hooks/useMemberAuth';
import MemberLogin from './MemberLogin';
import MemberDashboard from './MemberDashboard';
import MemberResetPassword from './MemberResetPassword';

export default function MemberPortal() {
  return (
    <MemberAuthProvider>
      <Routes>
        <Route path="login" element={<MemberLogin />} />
        <Route path="redefinir-senha" element={<MemberResetPassword />} />
        <Route path="/" element={<MemberDashboard />} />
        <Route path="*" element={<Navigate to="/aluno" replace />} />
      </Routes>
    </MemberAuthProvider>
  );
}
