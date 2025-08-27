import { useState, useEffect } from 'react';
import axios from 'axios';

const MessageManager = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_active: true
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      alert('Gagal memuat pesan. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingMessage) {
        // Update existing message
        await axios.put(`/messages/${editingMessage.id}`, formData);
      } else {
        // Create new message
        await axios.post('/messages', formData);
      }
      
      await loadMessages();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save message:', error);
      alert('Gagal menyimpan pesan. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setFormData({
      title: message.title,
      content: message.content,
      is_active: message.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
      return;
    }

    try {
      await axios.delete(`/messages/${messageId}`);
      await loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Gagal menghapus pesan. Silakan coba lagi.');
    }
  };

  const handleToggleActive = async (message) => {
    try {
      await axios.put(`/messages/${message.id}`, {
        is_active: !message.is_active
      });
      await loadMessages();
    } catch (error) {
      console.error('Failed to toggle message status:', error);
      alert('Gagal mengubah status pesan.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMessage(null);
    setFormData({
      title: '',
      content: '',
      is_active: true
    });
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

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kelola Pesan</h1>
          <p className="text-gray-600">Buat dan kelola template pesan untuk automation</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-hover-scale"
        >
          <span className="mr-2">➕</span>
          Tambah Pesan
        </button>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <span className="text-6xl mb-4 block">💬</span>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Belum Ada Pesan</h3>
          <p className="text-gray-600 mb-4">Buat template pesan pertama Anda untuk memulai automation</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            Buat Pesan Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="bg-white rounded-lg shadow-md p-6 card-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {message.title}
                    </h3>
                    <span className={`badge ${message.is_active ? 'badge-success' : 'badge-error'}`}>
                      {message.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Dibuat: {new Date(message.created_at).toLocaleDateString('id-ID')}</span>
                    {message.updated_at !== message.created_at && (
                      <span>Diupdate: {new Date(message.updated_at).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(message)}
                    className={`btn btn-sm ${message.is_active ? 'btn-secondary' : 'btn-success'}`}
                    title={message.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {message.is_active ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => handleEdit(message)}
                    className="btn btn-sm btn-outline"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(message.id)}
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingMessage ? 'Edit Pesan' : 'Tambah Pesan Baru'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Judul Pesan</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="form-input"
                    placeholder="Contoh: Pesan Promosi Produk A"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Isi Pesan</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="form-input form-textarea"
                    placeholder="Tuliskan isi pesan yang akan dikirim..."
                    rows="6"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pesan hanya mendukung format teks. Emoji diperbolehkan.
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
                    Aktifkan pesan ini untuk automation
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

export default MessageManager;