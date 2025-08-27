import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const GroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    group_identifier: '',
    is_active: true
  });
  const [bulkText, setBulkText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
      alert('Gagal memuat grup. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingGroup) {
        await axios.put(`/groups/${editingGroup.id}`, formData);
      } else {
        await axios.post('/groups', formData);
      }
      
      await loadGroups();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save group:', error);
      alert('Gagal menyimpan grup. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkText.trim()) {
      alert('Silakan masukkan data grup terlebih dahulu.');
      return;
    }

    setBulkLoading(true);
    try {
      const groups = bulkText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await axios.post('/groups/bulk', { groups });
      
      await loadGroups();
      setShowBulkModal(false);
      setBulkText('');
      
      if (response.data.length > 0) {
        alert(`Berhasil menambahkan ${response.data.length} grup baru.`);
      } else {
        alert('Tidak ada grup baru yang ditambahkan. Mungkin semua grup sudah ada.');
      }
    } catch (error) {
      console.error('Failed to bulk import groups:', error);
      alert('Gagal mengimpor grup. Silakan coba lagi.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Parse CSV - assume first column contains group identifiers
        const lines = content.split('\n');
        const groupIdentifiers = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Handle CSV format - take first column (could be comma or semicolon separated)
            const columns = line.split(/[,;]/);
            if (columns[0] && columns[0].trim()) {
              groupIdentifiers.push(columns[0].trim());
            }
          }
        }
        
        setBulkText(groupIdentifiers.join('\n'));
      } else {
        // Treat as TXT file - one group per line
        setBulkText(content);
      }
    };
    
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      group_identifier: group.group_identifier,
      is_active: group.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus grup ini?')) {
      return;
    }

    try {
      await axios.delete(`/groups/${groupId}`);
      await loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Gagal menghapus grup. Silakan coba lagi.');
    }
  };

  const handleToggleActive = async (group) => {
    try {
      await axios.put(`/groups/${group.id}`, {
        is_active: !group.is_active
      });
      await loadGroups();
    } catch (error) {
      console.error('Failed to toggle group status:', error);
      alert('Gagal mengubah status grup.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({
      group_identifier: '',
      is_active: true
    });
  };

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
    setBulkText('');
  };

  const getGroupTypeIcon = (type) => {
    switch (type) {
      case 'username': return '👤';
      case 'invite_link': return '🔗';
      case 'group_id': return '🔢';
      default: return '📱';
    }
  };

  const getGroupTypeLabel = (type) => {
    switch (type) {
      case 'username': return 'Username';
      case 'invite_link': return 'Link Undangan';
      case 'group_id': return 'Group ID';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Kelola Grup</h1>
          <p className="text-gray-600">Tambah dan kelola grup target untuk automation</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary btn-hover-scale text-sm px-4 py-2"
          >
            <span className="mr-2">📥</span>
            Import Bulk
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-hover-scale text-sm px-4 py-2"
          >
            <span className="mr-2">➕</span>
            Tambah Grup
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <span className="text-lg md:text-xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Grup</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{groups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full">
              <span className="text-lg md:text-xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-xs md:text-sm font-medium text-gray-600">Grup Aktif</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {groups.filter(g => g.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full">
              <span className="text-lg md:text-xl">⏸️</span>
            </div>
            <div className="ml-3">
              <p className="text-xs md:text-sm font-medium text-gray-600">Nonaktif</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {groups.filter(g => !g.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <span className="text-4xl md:text-6xl mb-4 block">👥</span>
          <h3 className="text-lg md:text-xl font-medium text-gray-900 mb-2">Belum Ada Grup</h3>
          <p className="text-gray-600 mb-4 text-sm md:text-base">Tambahkan grup pertama Anda untuk memulai automation</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary text-sm md:text-base"
          >
            Tambah Grup Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden">
            {groups.map((group) => (
              <div key={group.id} className="border-b border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-lg">{getGroupTypeIcon(group.group_type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {group.parsed_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getGroupTypeLabel(group.group_type)}
                      </p>
                    </div>
                  </div>
                  <span className={`badge text-xs ${group.is_active ? 'badge-success' : 'badge-error'}`}>
                    {group.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                
                <div className="mb-2">
                  <p className="text-xs text-gray-600 break-all">
                    {group.group_identifier}
                  </p>
                  {group.resolved_id && (
                    <p className="text-xs text-gray-400">
                      ID: {group.resolved_id}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {new Date(group.created_at).toLocaleDateString('id-ID')}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleActive(group)}
                      className={`btn btn-sm ${group.is_active ? 'btn-secondary' : 'btn-success'}`}
                      title={group.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {group.is_active ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleEdit(group)}
                      className="btn btn-sm btn-outline"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="btn btn-sm btn-danger"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identifier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ditambahkan
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map((group) => (
                  <tr key={group.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{getGroupTypeIcon(group.group_type)}</span>
                        <div className="text-sm font-medium text-gray-900">
                          {group.parsed_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 break-all max-w-xs">
                        {group.group_identifier}
                      </div>
                      {group.resolved_id && (
                        <div className="text-xs text-gray-500">
                          ID: {group.resolved_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getGroupTypeLabel(group.group_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${group.is_active ? 'badge-success' : 'badge-error'}`}>
                        {group.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(group.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(group)}
                          className={`btn btn-sm ${group.is_active ? 'btn-secondary' : 'btn-success'}`}
                          title={group.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {group.is_active ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => handleEdit(group)}
                          className="btn btn-sm btn-outline"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="btn btn-sm btn-danger"
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingGroup ? 'Edit Grup' : 'Tambah Grup Baru'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Link/Username/ID Grup</label>
                  <textarea
                    value={formData.group_identifier}
                    onChange={(e) => setFormData({...formData, group_identifier: e.target.value})}
                    className="form-input resize-none"
                    rows={3}
                    placeholder="Contoh:
@namagrup
https://t.me/namagrup
-1001234567890
https://t.me/joinchat/xyz"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sistem akan otomatis mendeteksi tipe grup dan membuat nama
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Aktifkan grup ini untuk automation
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
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

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Import Bulk Grup
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Impor dari File</label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleFileImport}
                      className="form-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline text-sm"
                    >
                      📁 Pilih File
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Format yang didukung: TXT (satu grup per baris) atau CSV (kolom pertama)
                  </p>
                </div>

                <div>
                  <label className="form-label">Atau Masukkan Manual</label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="form-input resize-none"
                    rows={10}
                    placeholder="Masukkan satu grup per baris:

@gruppertama
https://t.me/grupkedua
-1001234567890
https://t.me/joinchat/xyz"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Satu grup per baris. Format yang didukung: username, link Telegram, group ID, atau invite link
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseBulkModal}
                    className="btn btn-outline flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={bulkLoading || !bulkText.trim()}
                    className={`btn btn-primary flex-1 ${bulkLoading ? 'loading' : ''}`}
                  >
                    {bulkLoading && <div className="spinner"></div>}
                    {bulkLoading ? 'Mengimpor...' : 'Import Grup'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManager;