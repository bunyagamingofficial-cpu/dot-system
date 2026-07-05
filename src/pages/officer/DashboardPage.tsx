import React, { useEffect, useState, ReactNode } from 'react';
import {
  Users, DollarSign, FileText, TrendingUp, Clock, AlertCircle, Pin,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Announcement } from '../../lib/types';
import { useAuth } from '../../lib/AuthContext';

export function DashboardPage() {
  const { officer } = useAuth();
  const [onDutyCount, setOnDutyCount] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [todayRecords, setTodayRecords] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchAnnouncements()]).finally(() => setLoading(false));
  }, []);

  async function fetchStats() {
    const [duty, unpaid, today] = await Promise.all([
      supabase.from('officers').select('id', { count: 'exact', head: true }).eq('is_on_duty', true).eq('status', 'active'),
      supabase.from('service_records').select('amount').eq('status', 'unpaid'),
      supabase.from('service_records').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().slice(0, 10)),
    ]);
    setOnDutyCount(duty.count ?? 0);
    if (unpaid.data) {
      setUnpaidCount(unpaid.data.length);
      setUnpaidTotal(unpaid.data.reduce((s, r) => s + r.amount, 0));
    }
    setTodayRecords(today.count ?? 0);
  }

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4);
    setAnnouncements(data ?? []);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'อรุณสวัสดิ์';
    if (h < 18) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  const formatMoney = (n: number) => n.toLocaleString('th-TH') + ' บาท';
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-400 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold text-white">{officer?.name}</h1>
        <p className="text-amber-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="เจ้าหน้าที่ปฏิบัติหน้าที่"
          value={onDutyCount.toString()}
          icon={<Users size={20} />}
          color="emerald"
          loading={loading}
        />
        <StatCard
          label="รายการค้างชำระ"
          value={unpaidCount.toString()}
          icon={<AlertCircle size={20} />}
          color="red"
          loading={loading}
        />
        <StatCard
          label="ยอดค้างชำระทั้งหมด"
          value={formatMoney(unpaidTotal)}
          icon={<DollarSign size={20} />}
          color="amber"
          loading={loading}
          small
        />
        <StatCard
          label="บริการวันนี้"
          value={todayRecords.toString()}
          icon={<TrendingUp size={20} />}
          color="blue"
          loading={loading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">ประกาศล่าสุด</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-3 bg-navy-600 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-navy-600 rounded w-1/2" />
                </div>
              ))
            ) : announcements.length === 0 ? (
              <div className="card p-8 text-center text-gray-500 text-sm">ยังไม่มีประกาศ</div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      ann.is_pinned ? 'bg-amber-500/20' : 'bg-blue-900/40'
                    }`}>
                      {ann.is_pinned ? <Pin size={14} className="text-amber-400" /> : <FileText size={14} className="text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {ann.is_pinned && (
                          <span className="text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">ปักหมุด</span>
                        )}
                        <span className="text-xs text-gray-500">{formatDate(ann.created_at)}</span>
                      </div>
                      <div className="text-white text-sm font-medium truncate">{ann.title}</div>
                      <div className="text-gray-400 text-xs line-clamp-1 mt-0.5">{ann.content}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">สถานะปัจจุบัน</h2>
          </div>
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">สถานะ</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                officer?.is_on_duty
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {officer?.is_on_duty ? '● ปฏิบัติหน้าที่' : '○ ไม่ได้ปฏิบัติหน้าที่'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">ตำแหน่ง</span>
              <span className="text-white text-sm">{officer?.rank === 'commissioner' ? 'หัวหน้ากรม' : officer?.rank === 'inspector' ? 'ผู้คุมสอบ' : 'พนักงาน'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Username</span>
              <span className="text-amber-400 text-sm font-mono">{officer?.username}</span>
            </div>
            <div className="pt-3 border-t border-blue-900/40 text-xs text-gray-500">
              ไปที่เมนู "ปฏิบัติการ" เพื่อลงชื่อเข้า-ออกเวร
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color, loading, small,
}: {
  label: string; value: string; icon: ReactNode; color: string; loading: boolean; small?: boolean;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <div className="card p-5">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-3 bg-navy-600 rounded w-3/4 mb-3" />
          <div className="h-7 bg-navy-600 rounded w-1/2" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs">{label}</span>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>{icon}</div>
          </div>
          <div className={`font-bold text-white ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
        </>
      )}
    </div>
  );
}

