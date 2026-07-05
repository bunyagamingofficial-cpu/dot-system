import React, { useEffect, useState, ReactNode } from 'react';
import {
  Plus, Edit2, Trash2, Users, Shield, ShieldOff, Key, Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { hashPassword } from '../../lib/crypto';
import {
  Officer, OfficerRank, Department,
  RANK_LABELS, DEPARTMENT_LABELS, DEPARTMENTS,
} from '../../lib/types';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/Badge';
import { Modal, ConfirmDialog } from '../../components/Modal';

type ActionType = 'suspend' | 'activate' | 'delete' | 'reset';

export function OfficerManagementPage() {
  const { officer: currentOfficer } = useAuth();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Officer | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: ActionType; target: Officer } | null>(null);
  const [resetPw, setResetPw] = useState('');

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    rank: 'officer' as OfficerRank,
    department: 'traffic_management' as Department,
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from('officers')
      .select('*')
      .neq('status', 'deleted')
      .order('rank')
      .order('name');
    setOfficers(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditItem(null);
    setForm({ username: '', password: '', name: '', rank: 'officer', department: 'traffic_management' });
    setShowForm(true);
  }

  function openEdit(item: Officer) {
    setEditItem(item);
    setForm({ username: item.username, password: '', name: item.name, rank: item.rank, department: item.department });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editItem) {
      const update: Partial<Officer> & { updated_at: string } = {
        name: form.name,
        rank: form.rank,
        department: form.department,
        updated_at: new Date().toISOString(),
      };
      if (form.password) {
        update.password_hash = await hashPassword(form.password);
      }
      await supabase.from('officers').update(update).eq('id', editItem.id);
    } else {
      if (!form.password) return;
      const hash = await hashPassword(form.password);
      const { error } = await supabase.from('officers').insert({
        username: form.username,
        password_hash: hash,
        name: form.name,
        rank: form.rank,
        department: form.department,
        status: 'active',
        is_on_duty: false,
      });
      if (error) {
        alert('ไม่สามารถเพิ่มเจ้าหน้าที่ได้ อาจมี Username ซ้ำ');
        return;
      }
    }
    setShowForm(false);
    setEditItem(null);
    await fetchAll();
  }

  async function executeAction() {
    if (!confirmAction || !currentOfficer) return;
    const { type, target } = confirmAction;

    if (type === 'suspend') {
      await supabase.from('officers').update({ status: 'suspended', is_on_duty: false, updated_at: new Date().toISOString() }).eq('id', target.id);
    } else if (type === 'activate') {
      await supabase.from('officers').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', target.id);
    } else if (type === 'delete') {
      await supabase.from('officers').update({ status: 'deleted', is_on_duty: false, updated_at: new Date().toISOString() }).eq('id', target.id);
      await supabase.from('audit_logs').insert({
        action: 'DELETE_OFFICER',
        target_type: 'officer',
        target_id: target.id,
        performed_by: currentOfficer.id,
        performed_by_name: currentOfficer.name,
        details: { deleted_name: target.name, deleted_username: target.username },
      });
    } else if (type === 'reset') {
      if (!resetPw) return;
      const hash = await hashPassword(resetPw);
      await supabase.from('officers').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', target.id);
      setResetPw('');
    }

    setConfirmAction(null);
    await fetchAll();
  }

  const filtered = officers.filter((o) => {
    const q = searchQ.toLowerCase();
    return !q || o.name.toLowerCase().includes(q) || o.username.toLowerCase().includes(q);
  });

  const rankBadge = (rank: OfficerRank) => {
    if (rank === 'commissioner') return <Badge variant="warning">{RANK_LABELS[rank]}</Badge>;
    if (rank === 'inspector') return <Badge variant="info">{RANK_LABELS[rank]}</Badge>;
    return <Badge variant="neutral">{RANK_LABELS[rank]}</Badge>;
  };

  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="success">ปกติ</Badge>;
    if (status === 'suspended') return <Badge variant="danger">ระงับ</Badge>;
    return <Badge variant="neutral">{status}</Badge>;
  };

  const confirmMessages: Record<ActionType, { title: string; msg: string; label: string }> = {
    suspend: { title: 'ระงับการใช้งาน', msg: 'เจ้าหน้าที่จะไม่สามารถเข้าสู่ระบบได้', label: 'ระงับ' },
    activate: { title: 'เปิดใช้งานอีกครั้ง', msg: 'เจ้าหน้าที่จะสามารถเข้าสู่ระบบได้', label: 'เปิดใช้งาน' },
    delete: { title: 'ลบเจ้าหน้าที่', msg: 'บัญชีจะถูกลบและไม่สามารถเข้าสู่ระบบได้อีก (ประวัติจะยังคงเก็บไว้)', label: 'ลบ' },
    reset: { title: 'รีเซ็ตรหัสผ่าน', msg: 'ระบุรหัสผ่านใหม่สำหรับเจ้าหน้าที่', label: 'รีเซ็ต' },
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">จัดการเจ้าหน้าที่</h1>
          <p className="section-subtitle">เพิ่ม แก้ไข และจัดการบัญชีเจ้าหน้าที่</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> เพิ่มเจ้าหน้าที่
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input-field pl-9" placeholder="ค้นหาชื่อหรือ Username..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={36} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">ไม่พบเจ้าหน้าที่</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-900/40">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">ชื่อ / Username</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">ตำแหน่ง</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">แผนก</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">เวร</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className={`table-row ${o.id === currentOfficer?.id ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-400 font-bold text-sm">{o.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{o.name}</div>
                          <div className="text-gray-500 text-xs font-mono">@{o.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{rankBadge(o.rank)}</td>
                    <td className="px-5 py-4 text-sm text-gray-400">{DEPARTMENT_LABELS[o.department]}</td>
                    <td className="px-5 py-4 text-center">{statusBadge(o.status)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.is_on_duty ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 bg-gray-600/10'}`}>
                        {o.is_on_duty ? '● ปฏิบัติ' : '○ ว่าง'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <ActionBtn icon={<Edit2 size={13} />} label="แก้ไข" color="blue" onClick={() => openEdit(o)} />
                        <ActionBtn icon={<Key size={13} />} label="รีเซ็ต PW" color="amber" onClick={() => setConfirmAction({ type: 'reset', target: o })} />
                        {o.status === 'active'
                          ? <ActionBtn icon={<ShieldOff size={13} />} label="ระงับ" color="red" onClick={() => setConfirmAction({ type: 'suspend', target: o })} />
                          : <ActionBtn icon={<Shield size={13} />} label="เปิด" color="green" onClick={() => setConfirmAction({ type: 'activate', target: o })} />
                        }
                        {o.id !== currentOfficer?.id && (
                          <ActionBtn icon={<Trash2 size={13} />} label="ลบ" color="darkred" onClick={() => setConfirmAction({ type: 'delete', target: o })} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editItem ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่ใหม่'} onClose={() => { setShowForm(false); setEditItem(null); }} size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">ชื่อ-นามสกุล *</label>
              <input required className="input-field" placeholder="ชื่อเจ้าหน้าที่" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editItem && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Username *</label>
                <input required className="input-field font-mono" placeholder="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1">{editItem ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}</label>
              <input
                type="password"
                required={!editItem}
                className="input-field"
                placeholder="รหัสผ่าน"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ตำแหน่ง</label>
              <select className="input-field" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value as OfficerRank })}>
                {(Object.entries(RANK_LABELS) as [OfficerRank, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">แผนก</label>
              <select className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-secondary flex-1">ยกเลิก</button>
              <button type="submit" className="btn-primary flex-1">{editItem ? 'บันทึก' : 'เพิ่มเจ้าหน้าที่'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={`${confirmMessages[confirmAction.type].title} — ${confirmAction.target.name}`}
          message={confirmMessages[confirmAction.type].msg}
          confirmLabel={confirmMessages[confirmAction.type].label}
          danger={confirmAction.type === 'delete' || confirmAction.type === 'suspend'}
          onConfirm={executeAction}
          onCancel={() => { setConfirmAction(null); setResetPw(''); }}
          extraField={
            confirmAction.type === 'reset'
              ? { label: 'รหัสผ่านใหม่', value: resetPw, onChange: setResetPw, placeholder: 'กรอกรหัสผ่านใหม่...' }
              : undefined
          }
        />
      )}
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick }: { icon: ReactNode; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 hover:bg-blue-500/10',
    amber: 'text-amber-400 hover:bg-amber-500/10',
    red: 'text-orange-400 hover:bg-orange-500/10',
    green: 'text-emerald-400 hover:bg-emerald-500/10',
    darkred: 'text-red-400 hover:bg-red-500/10',
  };
  return (
    <button
      title={label}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors text-gray-500 ${colors[color]}`}
    >
      {icon}
    </button>
  );
}

