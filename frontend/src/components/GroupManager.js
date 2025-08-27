import { useState, useEffect } from 'react';
import axios from 'axios';

const GroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    group_link: '',
    username: '',
    group_id: '',
    is_active: true
  });
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      group_link: group.group_link,
      username: group.username || '',
      group_id: group.group_id || '',
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
      name: '',
      group_link: '',
      username: '',
      group_id: '',
      is_active: true
    });
  };

  const parseGroupLink = (link) => {
    // Extract information from various Telegram group link formats
    if (link.includes('t.me/joinchat/')) {
      return { type: 'invite', value: link };
    } else if (link.includes('t.me/') && !link.includes('joinchat')) {
      const username = link.split('t.me/')[1].replace('@', '');
      return { type: 'username', value: username };
    }
    return { type: 'unknown', value: link };
  };

  if (loading) {
    return (
      <div className="p-6">
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
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kelola Grup</h1>
          <p className="text-gray-600">Tambah dan kelola grup target untuk automation</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-hover-scale"
        >
          <span className="mr-2">➕</span>
          Tambah Grup
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <span className="text-xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Grup</p>
              <p className="text-xl font-bold text-gray-900">{groups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Grup Aktif</p>
              <p className="text-xl font-bold text-gray-900">
                {groups.filter(g => g.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 card-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full">
              <span className="text-xl">⏸️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Nonaktif</p>
              <p className="text-xl font-bold text-gray-900">
                {groups.filter(g => !g.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <span className="text-6xl mb-4 block">👥</span>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Belum Ada Grup</h3>
          <p className="text-gray-600 mb-4">Tambahkan grup pertama Anda untuk memulai automation</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            Tambah Grup Pertama
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
                    Link/Username
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
                {groups.map((group) => {
                  const linkInfo = parseGroupLink(group.group_link);
                  return (
                    <tr key={group.id} className="table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {group.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 break-all">
                          {linkInfo.type === 'username' ? (
                            <span className="inline-flex items-center">
                              <span className="mr-1">@</span>
                              {linkInfo.value}
                            </span>
                          ) : (
                            <span className="truncate max-w-xs" title={group.group_link}>
                              {group.group_link}
                            </span>
                          )}
                        </div>
                        {group.group_id && (
                          <div className="text-xs text-gray-500">
                            ID: {group.group_id}
                          </div>
                        )}
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
                  );
                })}
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
                {editingGroup ? 'Edit Grup' : 'Tambah Grup Baru'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Nama Grup</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                    placeholder="Contoh: Grup Marketing A"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Link Grup / Username</label>
                  <input
                    type="text"
                    value={formData.group_link}
                    onChange={(e) => setFormData({...formData, group_link: e.target.value})}
                    className="form-input"
                    placeholder="https://t.me/namagrup atau @namagrup"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bisa berupa link undangan atau username grup
                  </p>
                </div>

                <div>
                  <label className="form-label">Username Grup (Opsional)</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="form-input"
                    placeholder="namagrup (tanpa @)"
                  />
                </div>

                <div>
                  <label className="form-label">Group ID (Opsional)</label>
                  <input
                    type="text"
                    value={formData.group_id}
                    onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                    className="form-input"
                    placeholder="-1001234567890"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ID akan otomatis terdeteksi saat pengiriman pertama
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

export default GroupManager;