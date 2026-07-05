import React, { useEffect, useState } from 'react';
import { Plus, Search, DollarSign, CheckCircle, Clock, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ServiceRecord, ServiceRate } from '../../lib/types';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export function ServiceFeesPage() {
  const { officer } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);

  const [form, setForm] = useState({
    roblox_username: '',
    discord_username: '',
    service_rate_id: '',
    service_name: '',
    amount: '',
    status: 'unpaid' as 'paid' | 'unpaid',
    notes: '',
    service_date: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [rec, rateData] = await Promise.all([
      supabase.from('service_records').select('*').order('service_date', { ascending: false }),
      supabase.from('service_rates').select('*').eq('is_active', true).order('name'),
    ]);
    setRecords(rec.data ?? []);
    setRates(rateData.data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      roblox_username: '', discord_username: '', service_rate_id: '',
      service_name: '', amount: '', status: 'unpaid', notes: '',
      service_date: new Date().toISOString().slice(0, 16),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!officer) return;

    const payload = {
      roblox_username: form.roblox_username,
      discord_username: form.discord_username,
      service_rate_id: form.service_rate_id || null,
      service_name: form.service_name,
      amount: parseFloat(form.amount) || 0,
      status: form.status,
      officer_id: officer.id,
      officer_name: officer.name,
      notes: form.notes,
      service_date: new Date(form.service_date).toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editRecord) {
      await supabase.from('service_records').update(payload).eq('id', editRecord.id);
    } else {
      await supabase.from('service_records').insert(payload);
    }

    setShowAdd(false);
    setEditRecord(null);
    resetForm();
    await fetchAll();
  }

  function openEdit(rec: ServiceRecord) {
    setEditRecord(rec);
    setForm({
      roblox_username: rec.roblox_username,
      discord_username: rec.discord_username,
      service_rate_id: rec.service_rate_id ?? '',
      service_name: rec.service_name,
      amount: rec.amount.toString(),
      status: rec.status,
      notes: rec.notes,
      service_date: new Date(rec.service_date).toISOString().slice(0, 16),
    });
    setShowAdd(true);
  }

  async function toggleStatus(rec: ServiceRecord) {
    const newStatus = rec.status === 'paid' ? 'unpaid' : 'paid';
    await supabase.from('service_records').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', rec.id);
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, status: newStatus } : r));
  }

  function handleRateSelect(rateId: string) {
    const rate = rates.find((r) => r.id === rateId);
    setForm((f) => ({
      ...f,
      service_rate_id: rateId,
      service_name: rate?.name ?? f.service_name,
      amount: rate ? rate.price.toString() : f.amount,
    }));
  }

  const filtered = records.filter((r) => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || r.roblox_username.toLowerCase().includes(q) || r.discord_username.toLowerCase().includes(q) || r.service_name.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchQ && matchStatus;
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatMoney = (n: number) => n.toLocaleString('th-TH') + ' ฿';

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">ค่าบริการ</h1>
          <p className="section-subtitle">จัดการรายการค่าบริการ</p>
        </div>
        <button onClick={() => { setEditRecord(null); resetForm(); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> เพิ่มรายการ
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-9"
            placeholder="ค้นหา Username หรือบริการ..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'unpaid', 'paid'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === s ? 'bg-amber-500 text-navy-900' : 'btn-secondary'
              }`}
            >
              {s === 'all' ? 'ทั้งหมด' : s === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign size={36} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">ไม่พบรายการ</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-900/40">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">ประชาชน</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">บริการ</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">วันที่</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">เจ้าหน้าที่</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">ยอด</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => (
                  <tr key={rec.id} className="table-row">
                    <td className="px-5 py-4">
                      {rec.roblox_username && <div className="text-white text-sm">{rec.roblox_username}</div>}
                      {rec.discord_username && <div className="text-gray-400 text-xs">{rec.discord_username}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-white text-sm font-medium">{rec.service_name}</div>
                      {rec.notes && <div className="text-gray-500 text-xs">{rec.notes}</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{formatDate(rec.service_date)}</td>
                    <td className="px-5 py-4 text-sm text-gray-400">{rec.officer_name}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-white whitespace-nowrap">{formatMoney(rec.amount)}</td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => toggleStatus(rec)}>
                        <Badge variant={rec.status === 'paid' ? 'success' : 'danger'}>
                          {rec.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => openEdit(rec)} className="text-gray-500 hover:text-amber-400 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <Modal
          title={editRecord ? 'แก้ไขรายการค่าบริการ' : 'เพิ่มรายการค่าบริการ'}
          onClose={() => { setShowAdd(false); setEditRecord(null); resetForm(); }}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Roblox Username</label>
                <input className="input-field" placeholder="ชื่อ Roblox" value={form.roblox_username} onChange={(e) => setForm({ ...form, roblox_username: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Discord Username</label>
                <input className="input-field" placeholder="ชื่อ Discord" value={form.discord_username} onChange={(e) => setForm({ ...form, discord_username: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">ประเภทบริการ (เลือกจากรายการ)</label>
              <select className="input-field" value={form.service_rate_id} onChange={(e) => handleRateSelect(e.target.value)}>
                <option value="">-- เลือกประเภทบริการ --</option>
                {rates.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.price.toLocaleString()} ฿)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">ชื่อบริการ *</label>
                <input className="input-field" required placeholder="ชื่อบริการ" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">ราคา (บาท) *</label>
                <input type="number" className="input-field" required placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">วันที่ให้บริการ</label>
                <input type="datetime-local" className="input-field" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">สถานะ</label>
                <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                  <option value="unpaid">ค้างชำระ</option>
                  <option value="paid">ชำระแล้ว</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">หมายเหตุ</label>
              <textarea className="input-field" rows={2} placeholder="หมายเหตุ..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowAdd(false); setEditRecord(null); resetForm(); }} className="btn-secondary flex-1">
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary flex-1">
                {editRecord ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
