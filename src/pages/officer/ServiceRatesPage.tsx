import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ServiceRate } from '../../lib/types';
import { Badge } from '../../components/Badge';
import { Modal, ConfirmDialog } from '../../components/Modal';

const CATEGORIES: Record<string, string> = {
  civil_maintenance: 'โยธาซ่อมบำรุง',
  vehicle_rescue: 'กู้ภัยรถยก',
  electrical: 'การไฟฟ้า',
  traffic_management: 'จัดการจราจร',
  emergency_assistance: 'ช่วยเหลือฉุกเฉิน',
  general: 'ทั่วไป',
};

export function ServiceRatesPage() {
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ServiceRate | null>(null);
  const [deleteItem, setDeleteItem] = useState<ServiceRate | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'general', is_active: true });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from('service_rates').select('*').order('category').order('name');
    setRates(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditItem(null);
    setForm({ name: '', description: '', price: '', category: 'general', is_active: true });
    setShowForm(true);
  }

  function openEdit(item: ServiceRate) {
    setEditItem(item);
    setForm({ name: item.name, description: item.description, price: item.price.toString(), category: item.category, is_active: item.is_active });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      category: form.category,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editItem) {
      await supabase.from('service_rates').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('service_rates').insert(payload);
    }
    setShowForm(false);
    setEditItem(null);
    await fetchAll();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await supabase.from('service_rates').delete().eq('id', deleteItem.id);
    setDeleteItem(null);
    await fetchAll();
  }

  async function toggleActive(item: ServiceRate) {
    await supabase.from('service_rates').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    setRates((prev) => prev.map((r) => r.id === item.id ? { ...r, is_active: !r.is_active } : r));
  }

  const grouped = rates.reduce<Record<string, ServiceRate[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">อัตราค่าบริการ</h1>
          <p className="section-subtitle">กำหนดและแก้ไขอัตราค่าบริการของ DOT</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> เพิ่มอัตราค่าบริการ
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="card p-5 animate-pulse h-24" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-16 text-center">
          <Tag size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">ยังไม่มีอัตราค่าบริการ</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catRates]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <h3 className="text-sm font-semibold text-white">{CATEGORIES[cat] ?? cat}</h3>
                <span className="text-xs text-gray-500 ml-1">({catRates.length} รายการ)</span>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-900/40">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">ชื่อบริการ</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">รายละเอียด</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">ราคา</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {catRates.map((rate) => (
                      <tr key={rate.id} className="table-row">
                        <td className="px-5 py-4 text-white text-sm font-medium">{rate.name}</td>
                        <td className="px-5 py-4 text-gray-400 text-sm">{rate.description || '-'}</td>
                        <td className="px-5 py-4 text-right text-white font-semibold text-sm">
                          {rate.price.toLocaleString('th-TH')} ฿
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => toggleActive(rate)} className="flex items-center gap-1.5 mx-auto">
                            {rate.is_active
                              ? <><ToggleRight size={18} className="text-emerald-400" /><span className="text-xs text-emerald-400">เปิดใช้</span></>
                              : <><ToggleLeft size={18} className="text-gray-600" /><span className="text-xs text-gray-500">ปิดใช้</span></>
                            }
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(rate)} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setDeleteItem(rate)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editItem ? 'แก้ไขอัตราค่าบริการ' : 'เพิ่มอัตราค่าบริการ'} onClose={() => { setShowForm(false); setEditItem(null); }} size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">ชื่อบริการ *</label>
              <input required className="input-field" placeholder="ชื่อบริการ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">แผนก</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ราคา (บาท) *</label>
              <input required type="number" min="0" className="input-field" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">รายละเอียด</label>
              <textarea className="input-field" rows={2} placeholder="รายละเอียดบริการ..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full relative transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-navy-600'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-300">เปิดใช้บริการ</span>
              <input type="checkbox" className="hidden" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-secondary flex-1">ยกเลิก</button>
              <button type="submit" className="btn-primary flex-1">{editItem ? 'บันทึก' : 'เพิ่ม'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteItem && (
        <ConfirmDialog
          title="ลบอัตราค่าบริการ"
          message={`ต้องการลบ "${deleteItem.name}" ราคา ${deleteItem.price.toLocaleString()} บาท ใช่หรือไม่?`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
}
