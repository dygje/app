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
      alert('Failed to load messages. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingMessage) {
        await axios.put(`/messages/${editingMessage.id}`, formData);
      } else {
        await axios.post('/messages', formData);
      }
      
      await loadMessages();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save message:', error);
      alert('Failed to save message. Please try again.');
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
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await axios.delete(`/messages/${messageId}`);
      await loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handleToggleActive = async (message) => {
    try {
      await axios.put(`/messages/${message.id}`, {
        ...message,
        is_active: !message.is_active
      });
      await loadMessages();
    } catch (error) {
      console.error('Failed to toggle message status:', error);
      alert('Failed to update message status.');
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
      <div className="space-y-6">
        <div className="material-fade-in">
          <div className="mb-6">
            <div className="h-8 bg-surface-200 rounded-md w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-surface-100 rounded w-64 animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="material-card-filled p-6 animate-pulse">
                <div className="h-6 bg-surface-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-surface-100 rounded mb-4"></div>
                <div className="h-4 bg-surface-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 material-fade-in">
      {/* Material Design Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-medium text-surface-900 font-normal mb-2">
            Message Management
          </h1>
          <p className="text-body-large text-surface-600">
            Create and manage message templates for automation
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="material-button-filled"
        >
          <span className="material-icons mr-2">add</span>
          Add Message
        </button>
      </div>

      {/* Material Design Stats Card */}
      <div className="material-grid material-grid-cols-3">
        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-primary-700 text-xl">message</span>
            </div>
            <div>
              <h3 className="text-title-large font-medium text-surface-900">
                {messages.length}
              </h3>
              <p className="text-body-medium text-surface-600">Total Messages</p>
            </div>
          </div>
        </div>

        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-success-700 text-xl">check_circle</span>
            </div>
            <div>
              <h3 className="text-title-large font-medium text-surface-900">
                {messages.filter(m => m.is_active).length}
              </h3>
              <p className="text-body-medium text-surface-600">Active Messages</p>
            </div>
          </div>
        </div>

        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-warning-700 text-xl">pause_circle</span>
            </div>
            <div>
              <h3 className="text-title-large font-medium text-surface-900">
                {messages.filter(m => !m.is_active).length}
              </h3>
              <p className="text-body-medium text-surface-600">Inactive Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Material Design Messages List */}
      <div className="material-card-elevated">
        <div className="px-6 py-4 border-b border-surface-200">
          <h2 className="text-title-large font-medium text-surface-900">
            Messages ({messages.length})
          </h2>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-surface-500 text-2xl">chat_bubble_outline</span>
            </div>
            <h3 className="text-title-medium text-surface-900 mb-2">No messages yet</h3>
            <p className="text-body-medium text-surface-600 mb-6">
              Create your first message template to start automation
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="material-button-filled"
            >
              <span className="material-icons mr-2">add</span>
              Create First Message
            </button>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {messages.map((message) => (
              <div
                key={message.id}
                className="p-6 hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-title-medium font-medium text-surface-900">
                        {message.title}
                      </h3>
                      <div className={`material-badge-${message.is_active ? 'success' : 'warning'}`}>
                        {message.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="material-card-outlined bg-surface-50 p-4 rounded-lg mb-4">
                      <p className="text-body-medium text-surface-700 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-body-small text-surface-500">
                      <span className="flex items-center">
                        <span className="material-icons text-xs mr-1">schedule</span>
                        Created: {new Date(message.created_at).toLocaleDateString()}
                      </span>
                      {message.updated_at !== message.created_at && (
                        <span className="flex items-center">
                          <span className="material-icons text-xs mr-1">update</span>
                          Updated: {new Date(message.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(message)}
                      className={`material-button-text p-2 ${
                        message.is_active 
                          ? 'text-warning-600 hover:bg-warning-50' 
                          : 'text-success-600 hover:bg-success-50'
                      }`}
                      title={message.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span className="material-icons">
                        {message.is_active ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => handleEdit(message)}
                      className="material-button-text p-2"
                      title="Edit Message"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(message.id)}
                      className="material-button-text p-2 text-error-600 hover:bg-error-50"
                      title="Delete Message"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Material Design Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 material-dialog-backdrop">
          <div className="material-dialog w-full max-w-lg material-scale-in">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title-large font-medium text-surface-900">
                  {editingMessage ? 'Edit Message' : 'Add New Message'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="material-button-text p-2 -mr-2"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="material-textfield">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="material-textfield-input peer"
                    placeholder=" "
                    required
                  />
                  <label className="material-textfield-label">
                    Message Title
                  </label>
                </div>

                <div className="material-textfield">
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="material-textfield-input peer min-h-32 resize-vertical"
                    placeholder=" "
                    rows="4"
                    required
                  />
                  <label className="material-textfield-label">
                    Message Content
                  </label>
                  <p className="text-body-small text-surface-500 mt-2">
                    Text messages only. Emojis are allowed.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-primary-600 bg-surface-100 border-surface-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="text-body-medium text-surface-700">
                    Activate this message for automation
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="material-button-outlined"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`material-button-filled ${actionLoading ? 'material-loading' : ''}`}
                  >
                    {actionLoading && <div className="material-spinner mr-2" />}
                    <span className="material-icons mr-2">
                      {editingMessage ? 'save' : 'add'}
                    </span>
                    {editingMessage ? 'Update Message' : 'Add Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Material Design FAB */}
      <button 
        onClick={() => setShowModal(true)}
        className="material-fab"
        title="Quick Add Message"
      >
        <span className="material-icons">add</span>
      </button>
    </div>
  );
};

export default MessageManager;