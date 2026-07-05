import React, { ReactNode } from 'react';
import { Truck, Users, FileText, DollarSign, LogIn, MessageSquare } from 'lucide-react';

export type PublicPage = 'home' | 'citizen' | 'login' | 'complaint' | 'rates';

interface Props {
  children: ReactNode;
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
}

export function PublicLayout({ children, currentPage, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-navy-800/95 backdrop-blur border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg group-hover:bg-amber-400 transition-colors">
                <Truck size={20} className="text-navy-900" />
              </div>
              <div className="text-left">
                <div className="text-xs text-amber-500 font-medium leading-none">BIT CITIES</div>
                <div className="text-base font-bold text-white leading-tight">DOT</div>
              </div>
            </button>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink active={currentPage === 'home'} onClick={() => onNavigate('home')} icon={<FileText size={15} />}>
                หน้าแรก
              </NavLink>
              <NavLink active={currentPage === 'citizen'} onClick={() => onNavigate('citizen')} icon={<Users size={15} />}>
                ระบบประชาชน
              </NavLink>
              <NavLink active={currentPage === 'rates'} onClick={() => onNavigate('rates')} icon={<DollarSign size={15} />}>
                อัตราค่าบริการ
              </NavLink>
              <NavLink active={currentPage === 'complaint'} onClick={() => onNavigate('complaint')} icon={<MessageSquare size={15} />}>
                ร้องเรียน
              </NavLink>
            </nav>

            {/* Right Actions */}
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
            >
              <LogIn size={15} />
              เข้าสู่ระบบเจ้าหน้าที่
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-navy-800 border-b border-blue-900/50 px-4 py-2 flex gap-1.5 overflow-x-auto">
        <MobileNavLink active={currentPage === 'home'} onClick={() => onNavigate('home')}>หน้าแรก</MobileNavLink>
        <MobileNavLink active={currentPage === 'citizen'} onClick={() => onNavigate('citizen')}>ระบบประชาชน</MobileNavLink>
        <MobileNavLink active={currentPage === 'rates'} onClick={() => onNavigate('rates')}>อัตราค่าบริการ</MobileNavLink>
        <MobileNavLink active={currentPage === 'complaint'} onClick={() => onNavigate('complaint')}>ร้องเรียน</MobileNavLink>
      </div>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-navy-800/50 border-t border-blue-900/30 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
              <Truck size={13} className="text-navy-900" />
            </div>
            <span className="text-amber-500 font-bold text-sm">Bit Cities Department of Transportation</span>
          </div>
          <p className="text-gray-500 text-xs">ระบบบริหารจัดการกรมขนส่ง — สงวนสิทธิ์สำหรับเจ้าหน้าที่ DOT เท่านั้น</p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ children, active, onClick, icon }: { children: ReactNode; active: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-blue-900/60 text-amber-400' : 'text-gray-300 hover:text-white hover:bg-navy-700'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function MobileNavLink({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
        active ? 'bg-blue-900/60 text-amber-400' : 'text-gray-400'
      }`}
    >
      {children}
    </button>
  );
}
