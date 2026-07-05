import React, { useState } from 'react';
import { Search, User, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ServiceRecord } from '../../lib/types';
import { Badge } from '../../components/Badge';

export function CitizenPage() {
  const [searchType, setSearchType] = useState<'roblox' | 'discord'>('roblox');
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);

    const field = searchType === 'roblox' ? 'roblox_username' : 'discord_username';
    const { data, error: err } = await supabase
      .from('service_records')
      .select('*')
      .ilike(field, `%${query.trim()}%`)
      .order('service_date', { ascending: false });

    if (err) {
      setError('เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง');
    } else {
      setRecords(data ?? []);
    }
    setSearched(true);
    setLoading(false);
  }

  const totalUnpaid = records.filter((r) => r.status === 'unpaid').reduce((s, r) => s + r.amount, 0);
  const totalPaid = records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatMoney = (n: number) => n.toLocaleString('th-TH') + ' บาท';

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex w-16 h-16 bg-blue-900/50 border border-blue-700/50 rounded-2xl items-center justify-center mb-4">
          <User size={30} className="text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">ระบบประชาชน</h1>
        <p className="text-gray-400">ตรวจสอบประวัติการใช้บริการและยอดค้างชำระ</p>
      </div>

      {/* Search Card */}
      <div className="card p-6 mb-8">
        <h2 className="text-base font-semibold text-white mb-4">ค้นหาประวัติ</h2>

        {/* Type Switcher */}
        <div className="flex gap-2 mb-4 p-1 bg-navy-900 rounded-lg">
          <button
            onClick={() => setSearchType('roblox')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              searchType === 'roblox' ? 'bg-amber-500 text-navy-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            Roblox Username
          </button>
          <button
            onClick={() => setSearchType('discord')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              searchType === 'discord' ? 'bg-amber-500 text-navy-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            Discord Username
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-9"
              placeholder={`ระบุ ${searchType === 'roblox' ? 'Roblox' : 'Discord'} Username...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary px-6 flex-shrink-0">
            {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {searched && (
        <>
          {records.length === 0 ? (
            <div className="card p-12 text-center">
              <Search size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">ไม่พบข้อมูล</p>
              <p className="text-gray-400 text-sm">ไม่พบประวัติการใช้บริการสำหรับ "{query}"</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{records.length}</div>
                  <div className="text-xs text-gray-400">รายการทั้งหมด</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">{formatMoney(totalUnpaid)}</div>
                  <div className="text-xs text-gray-400">ยอดค้างชำระ</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">{formatMoney(totalPaid)}</div>
                  <div className="text-xs text-gray-400">ชำระแล้ว</div>
                </div>
              </div>

              {totalUnpaid > 0 && (
                <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-red-400 font-semibold text-sm">มียอดค้างชำระ</div>
                    <div className="text-gray-400 text-xs mt-0.5">กรุณาติดต่อเจ้าหน้าที่ DOT เพื่อชำระค่าบริการ</div>
                  </div>
                </div>
              )}

              {/* Records Table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-blue-900/40">
                  <h3 className="text-sm font-semibold text-white">รายการทั้งหมด ({records.length} รายการ)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-blue-900/40">
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">บริการ</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">วันที่</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">เจ้าหน้าที่</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">ยอด</th>
                        <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec) => (
                        <tr key={rec.id} className="table-row">
                          <td className="px-5 py-4">
                            <div className="text-white text-sm font-medium">{rec.service_name}</div>
                            {rec.notes && <div className="text-xs text-gray-500 mt-0.5">{rec.notes}</div>}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{formatDate(rec.service_date)}</td>
                          <td className="px-5 py-4 text-sm text-gray-400">{rec.officer_name}</td>
                          <td className="px-5 py-4 text-right text-sm font-semibold text-white whitespace-nowrap">
                            {formatMoney(rec.amount)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <Badge variant={rec.status === 'paid' ? 'success' : 'danger'}>
                              {rec.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Help Note */}
      {!searched && (
        <div className="card p-6 text-center">
          <Clock size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">กรอก Username เพื่อตรวจสอบประวัติการใช้บริการและยอดค้างชำระ</p>
        </div>
      )}
    </div>
  );
}
