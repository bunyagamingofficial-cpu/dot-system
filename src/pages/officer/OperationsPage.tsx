import React, { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Users, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DutyLog, Officer, RANK_LABELS, DEPARTMENT_LABELS } from '../../lib/types';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/Modal';

export function OperationsPage() {
  const { officer, setOfficer, isCommissioner } = useAuth();
  const [onDutyOfficers, setOnDutyOfficers] = useState<Officer[]>([]);
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DutyLog | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [forceTarget, setForceTarget] = useState<{ officer: Officer; action: 'on' | 'off' } | null>(null);
  const [allOfficers, setAllOfficers] = useState<Officer[]>([]);

  useEffect(() => {
    fetchData();
  }, [officer?.id]);

  async function fetchData() {
    setLoading(true);
    const [duty, logs, all] = await Promise.all([
      supabase.from('officers').select('*').eq('is_on_duty', true).eq('status', 'active').order('name'),
      isCommissioner
        ? supabase.from('duty_logs').select('*').is('deleted_at', null).order('clock_in', { ascending: false }).limit(50)
        : supabase.from('duty_logs').select('*').eq('officer_id', officer?.id).is('deleted_at', null).order('clock_in', { ascending: false }).limit(30),
      isCommissioner ? supabase.from('officers').select('*').eq('status', 'active').order('name') : { data: [] },
    ]);
    setOnDutyOfficers(duty.data ?? []);
    setDutyLogs(logs.data ?? []);
    setAllOfficers((all as any).data ?? []);
    setLoading(false);
  }

  async function clockIn() {
    if (!officer || officer.is_on_duty) return;
    setClockLoading(true);
    const { error: logErr } = await supabase.from('duty_logs').insert({
      officer_id: officer.id,
      officer_name: officer.name,
      clock_in: new Date().toISOString(),
    });
    if (!logErr) {
      await supabase.from('officers').update({ is_on_duty: true, updated_at: new Date().toISOString() }).eq('id', officer.id);
      setOfficer({ ...officer, is_on_duty: true });
      await fetchData();
    }
    setClockLoading(false);
  }

  async function clockOut() {
    if (!officer || !officer.is_on_duty) return;
    setClockLoading(true);
    const { data: activeLog } = await supabase
      .from('duty_logs')
      .select('*')
      .eq('officer_id', officer.id)
      .is('clock_out', null)
      .is('deleted_at', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeLog) {
      const now = new Date();
      const dur = Math.round((now.getTime() - new Date(activeLog.clock_in).getTime()) / 60000);
      await supabase.from('duty_logs').update({
        clock_out: now.toISOString(),
        duration_minutes: dur,
      }).eq('id', activeLog.id);
    }
    await supabase.from('officers').update({ is_on_duty: false, updated_at: new Date().toISOString() }).eq('id', officer.id);
    setOfficer({ ...officer, is_on_duty: false });
    await fetchData();
    setClockLoading(false);
  }

  async function handleForce() {
    if (!forceTarget || !officer) return;
    const { officer: target, action } = forceTarget;
    const isOn = action === 'on';

    if (isOn) {
      await supabase.from('duty_logs').insert({
        officer_id: target.id,
        officer_name: target.name,
        clock_in: new Date().toISOString(),
      });
    } else {
      const { data: activeLog } = await supabase
        .from('duty_logs')
        .select('*')
        .eq('officer_id', target.id)
        .is('clock_out', null)
        .is('deleted_at', null)
        .maybeSingle();
      if (activeLog) {
        const now = new Date();
        const dur = Math.round((now.getTime() - new Date(activeLog.clock_in).getTime()) / 60000);
        await supabase.from('duty_logs').update({ clock_out: now.toISOString(), duration_minutes: dur }).eq('id', activeLog.id);
      }
    }

    await supabase.from('officers').update({ is_on_duty: isOn }).eq('id', target.id);
    await supabase.from('audit_logs').insert({
      action: isOn ? 'FORCE_ON_DUTY' : 'FORCE_OFF_DUTY',
      target_type: 'officer',
      target_id: target.id,
      performed_by: officer.id,
      performed_by_name: officer.name,
      details: { target_name: target.name },
    });
    setForceTarget(null);
    await fetchData();
  }

  async function handleDelete() {
    if (!deleteTarget || !officer) return;
    await supabase.from('duty_logs').update({
      deleted_at: new Date().toISOString(),
      deleted_by: officer.id,
      deleted_by_name: officer.name,
      delete_reason: deleteReason || 'ไม่ระบุเหตุผล',
    }).eq('id', deleteTarget.id);

    await supabase.from('audit_logs').insert({
      action: 'DELETE_DUTY_LOG',
      target_type: 'duty_log',
      target_id: deleteTarget.id,
      performed_by: officer.id,
      performed_by_name: officer.name,
      details: { officer_name: deleteTarget.officer_name, reason: deleteReason },
    });

    setDeleteTarget(null);
    setDeleteReason('');
    await fetchData();
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatDuration = (mins: number | null) => {
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}ชม. ${m}น.` : `${m}น.`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="section-title">ปฏิบัติการ</h1>
        <p className="section-subtitle">จัดการการเข้า-ออกเวรและสถานะการปฏิบัติหน้าที่</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Clock In/Out Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" /> การปฏิบัติหน้าที่ของฉัน
            </h2>
            <div className={`rounded-xl p-4 mb-4 text-center ${
              officer?.is_on_duty ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-navy-700 border border-blue-900/40'
            }`}>
              <div className={`text-lg font-bold mb-1 ${officer?.is_on_duty ? 'text-emerald-400' : 'text-gray-400'}`}>
                {officer?.is_on_duty ? '● กำลังปฏิบัติหน้าที่' : '○ ไม่ได้ปฏิบัติหน้าที่'}
              </div>
            </div>
            {!officer?.is_on_duty ? (
              <button onClick={clockIn} disabled={clockLoading} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                <LogIn size={16} /> {clockLoading ? 'กำลังดำเนินการ...' : 'ลงชื่อเข้าเวร'}
              </button>
            ) : (
              <button onClick={clockOut} disabled={clockLoading} className="w-full btn-danger py-3 flex items-center justify-center gap-2">
                <LogOut size={16} /> {clockLoading ? 'กำลังดำเนินการ...' : 'ลงชื่อออกเวร'}
              </button>
            )}
          </div>

          {/* On-Duty Officers */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              เจ้าหน้าที่ที่ปฏิบัติหน้าที่ ({onDutyOfficers.length})
            </h2>
            {onDutyOfficers.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-4">ยังไม่มีเจ้าหน้าที่ปฏิบัติหน้าที่</p>
            ) : (
              <div className="space-y-2">
                {onDutyOfficers.map((o) => (
                  <div key={o.id} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{o.name}</div>
                      <div className="text-gray-500 text-[10px]">{DEPARTMENT_LABELS[o.department]}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commissioner Force Controls */}
          {isCommissioner && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-white mb-3">จัดการสถานะเจ้าหน้าที่</h2>
              <div className="space-y-2">
                {allOfficers.filter((o) => o.id !== officer?.id).map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${o.is_on_duty ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{o.name}</div>
                    </div>
                    <button
                      onClick={() => setForceTarget({ officer: o, action: o.is_on_duty ? 'off' : 'on' })}
                      className={`text-[10px] px-2 py-1 rounded flex-shrink-0 ${
                        o.is_on_duty ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      }`}
                    >
                      {o.is_on_duty ? 'Force Off' : 'Force On'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-blue-900/40">
              <h2 className="text-sm font-semibold text-white">
                {isCommissioner ? 'ประวัติการปฏิบัติหน้าที่ทั้งหมด' : 'ประวัติของฉัน'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">กำลังโหลด...</div>
              ) : dutyLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">ยังไม่มีประวัติ</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-900/40">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">เจ้าหน้าที่</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">เข้าเวร</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ออกเวร</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ระยะเวลา</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                      {isCommissioner && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {dutyLogs.map((log) => (
                      <tr key={log.id} className="table-row">
                        <td className="px-4 py-3 text-sm text-white font-medium">{log.officer_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{formatTime(log.clock_in)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{log.clock_out ? formatTime(log.clock_out) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatDuration(log.duration_minutes)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={log.clock_out ? 'neutral' : 'success'}>
                            {log.clock_out ? 'เสร็จสิ้น' : 'กำลังปฏิบัติ'}
                          </Badge>
                        </td>
                        {isCommissioner && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setDeleteTarget(log)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="ลบประวัติการปฏิบัติหน้าที่"
          message={`ต้องการลบประวัติของ "${deleteTarget.officer_name}" ใช่หรือไม่?`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteReason(''); }}
          extraField={{ label: 'เหตุผลในการลบ', value: deleteReason, onChange: setDeleteReason, placeholder: 'ระบุเหตุผล...' }}
        />
      )}

      {/* Force Confirm */}
      {forceTarget && (
        <ConfirmDialog
          title={forceTarget.action === 'on' ? 'Force On Duty' : 'Force Off Duty'}
          message={`ต้องการ${forceTarget.action === 'on' ? 'เปิด' : 'ปิด'}การปฏิบัติหน้าที่ของ "${forceTarget.officer.name}" ใช่หรือไม่?`}
          confirmLabel="ยืนยัน"
          onConfirm={handleForce}
          onCancel={() => setForceTarget(null)}
        />
      )}
    </div>
  );
}
