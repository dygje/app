import { useState, useEffect } from 'react';
import axios from 'axios';

const BlacklistManager = () => {
  const [blacklistEntries, setBlacklistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    group_id: '',
    group_name: '',
    blacklist_type: 'temporary',
    reason: '',
    expires_at: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/blacklist');
      setBlacklistEntries(response.data);
    } catch (error) {
      console.error('Failed to load blacklist:', error);
      alert('Gagal memuat blacklist. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const dataToSubmit = { ...formData };
      
      // If temporary blacklist, set expiration date
      if (dataToSubmit.blacklist_type === 'temporary' && dataToSubmit.expires_at) {
        dataToSubmit.expires_at = new Date(dataToSubmit.expires_at).toISOString();
      } else if (dataToSubmit.blacklist_type === 'permanent') {
        dataToSubmit.expires_at = null;
      }

      await axios.post('/blacklist', dataToSubmit);
      await loadBlacklist();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to add blacklist entry:', error);
      alert('Gagal menambah blacklist. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (entryId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus entry blacklist ini?')) {
      return;
    }

    try {
      await axios.delete(`/blacklist/${entryId}`);
      await loadBlacklist();
    } catch (error) {
      console.error('Failed to remove blacklist entry:', error);
      alert('Gagal menghapus blacklist. Silakan coba lagi.');
    }
  };

  const handleCleanupExpired = async () => {
    try {
      setActionLoading(true);
      const response = await axios.post('/blacklist/cleanup');
      await loadBlacklist();
      alert(response.data.message);
    } catch (error) {
      console.error('Failed to cleanup blacklist:', error);
      alert('Gagal membersihkan blacklist.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      group_id: '',
      group_name: '',
      blacklist_type: 'temporary',
      reason: '',
      expires_at: ''
    });
  };

  const isExpired = (entry) => {
    if (entry.blacklist_type === 'permanent' || !entry.expires_at) {
      return false;
    }
    return new Date(entry.expires_at) < new Date();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getStatusBadge = (entry) => {
    if (entry.blacklist_type === 'permanent') {
      return <span className="badge badge-error">Permanen</span>;
    }
    
    if (isExpired(entry)) {
      return <span className="badge badge-warning">Kedaluwarsa</span>;
    }
    
    return <span className="badge badge-info">Sementara</span>;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const permanentEntries = blacklistEntries.filter(entry => entry.blacklist_type === 'permanent');
  const temporaryEntries = blacklistEntries.filter(entry => entry.blacklist_type === 'temporary');
  const expiredEntries = temporaryEntries.filter(entry => isExpired(entry));

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Blacklist Management</h1>
          <p className="text-gray-600">Kelola grup yang diblokir dari automation</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCleanupExpired}
            disabled={actionLoading}
            className={`btn btn-secondary ${actionLoading ? 'loading' : ''}`}
          >
            {actionLoading && <div className="spinner"></div>}
            🧹 Cleanup Expired
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-hover-scale"
          >
            <span className="mr-2">🚫</span>
            Tambah Blacklist
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full">
              <span className="text-xl">🚫</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Blacklist</p>
              <p className="text-xl font-bold text-gray-900">{blacklistEntries.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-full">
              <span className="text-xl">🔒</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Permanen</p>
              <p className="text-xl font-bold text-gray-900">{permanentEntries.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <span className="text-xl">⏰</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Sementara</p>
              <p className="text-xl font-bold text-gray-900">{temporaryEntries.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-full">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Kedaluwarsa</p>
              <p className="text-xl font-bold text-gray-900">{expiredEntries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blacklist Entries */}
      {blacklistEntries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <span className="text-6xl mb-4 block">🚫</span>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Blacklist Kosong</h3>
          <p className="text-gray-600 mb-4">Belum ada grup yang diblokir</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            Tambah Blacklist
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Grup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alasan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kedaluwarsa
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blacklistEntries.map((entry) => (
                  <tr key={entry.id} className={`table-row ${isExpired(entry) ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.group_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">
                        {entry.group_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(entry)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={entry.reason}>
                        {entry.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {entry.expires_at ? formatDateTime(entry.expires_at) : 'Tidak ada'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="btn btn-sm btn-danger"
                        title="Hapus dari blacklist"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Tambah Blacklist Entry
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Nama Grup</label>
                  <input
                    type="text"
                    value={formData.group_name}
                    onChange={(e) => setFormData({...formData, group_name: e.target.value})}
                    className="form-input"
                    placeholder="Nama grup yang akan diblokir"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Group ID</label>
                  <input
                    type="text"
                    value={formData.group_id}
                    onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                    className="form-input"
                    placeholder="-1001234567890"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Tipe Blacklist</label>
                  <select
                    value={formData.blacklist_type}
                    onChange={(e) => setFormData({...formData, blacklist_type: e.target.value})}
                    className="form-input"
                    required
                  >
                    <option value="temporary">Sementara</option>
                    <option value="permanent">Permanen</option>
                  </select>
                </div>

                {formData.blacklist_type === 'temporary' && (
                  <div>
                    <label className="form-label">Tanggal Kedaluwarsa</label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                      className="form-input"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Kosongkan untuk set default (1 jam dari sekarang)
                    </p>
                  </div>
                )}

                <div>
                  <label className="form-label">Alasan</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    className="form-input form-textarea"
                    placeholder="Alasan grup diblokir (contoh: ChatForbidden, SlowModeWait, dll)"
                    rows="3"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-outline flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`btn btn-primary flex-1 ${actionLoading ? 'loading' : ''}`}
                  >
                    {actionLoading && <div className="spinner"></div>}
                    {actionLoading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlacklistManager;