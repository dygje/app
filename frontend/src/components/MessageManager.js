import { useState, useEffect } from 'react';
import axios from 'axios';

const MessageManager = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [editingMessage, setEditingMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMessage, setNewMessage] = useState({
    name: '',
    content: '',
    is_active: true
  });

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
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async (e) => {
    e.preventDefault();
    setActionLoading({add: true});
    
    try {
      await axios.post('/messages', newMessage);
      setNewMessage({ name: '', content: '', is_active: true });
      setShowAddModal(false);
      loadMessages();
    } catch (error) {
      console.error('Failed to add message:', error);
      alert('Failed to add message. Please try again.');
    } finally {
      setActionLoading({});
    }
  };

  const handleUpdateMessage = async (messageId, updates) => {
    setActionLoading({[messageId]: true});
    
    try {
      await axios.put(`/messages/${messageId}`, updates);
      loadMessages();
    } catch (error) {
      console.error('Failed to update message:', error);
      alert('Failed to update message. Please try again.');
    } finally {
      setActionLoading({});
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message template?')) return;
    
    setActionLoading({[messageId]: true});
    
    try {
      await axios.delete(`/messages/${messageId}`);
      loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    } finally {
      setActionLoading({});
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 tg-fade-in">
        <div className="tg-card-elevated p-6 animate-pulse">
          <div className="h-8 bg-telegram-elevated rounded-telegram w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-telegram-elevated rounded-telegram"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 tg-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="tg-heading-1 mb-2">Message Templates</h1>
          <p className="tg-body-secondary">Create and manage your message templates for automation</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="fluent-btn-primary"
        >
          <span className="material-icons mr-2 text-sm">add</span>
          New Template
        </button>
      </div>

      {/* Messages List */}
      <div className="tg-card-elevated">
        <div className="p-6 border-b border-telegram-border">
          <h2 className="tg-heading-2">Templates ({messages.length})</h2>
        </div>
        
        <div className="p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-icons text-6xl text-telegram-textMuted mb-4 block">message</span>
              <h3 className="tg-heading-3 mb-2">No templates created yet</h3>
              <p className="tg-body-secondary mb-6">Create your first message template to start automation</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="fluent-btn-primary"
              >
                <span className="material-icons mr-2 text-sm">add</span>
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="tg-card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="tg-heading-3">{message.name}</h3>
                        <div className="flex items-center space-x-2">
                          <div className={`tg-status-${message.is_active ? 'online' : 'offline'}`}></div>
                          <span className="tg-caption">{message.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      
                      <div className="tg-card bg-telegram-elevated p-4 mb-4">
                        <p className="tg-body whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 tg-caption text-telegram-textMuted">
                        <span>{message.content.length} characters</span>
                        <span>•</span>
                        <span>Template ID: {message.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleUpdateMessage(message.id, { is_active: !message.is_active })}
                        disabled={actionLoading[message.id]}
                        className="fluent-btn-ghost p-2"
                      >
                        <span className="material-icons text-sm">
                          {message.is_active ? 'pause' : 'play_arrow'}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setEditingMessage(message)}
                        disabled={actionLoading[message.id]}
                        className="fluent-btn-ghost p-2"
                      >
                        <span className="material-icons text-sm">edit</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        disabled={actionLoading[message.id]}
                        className="fluent-btn-ghost p-2 text-telegram-red hover:text-red-400"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Message Modal */}
      {showAddModal && (
        <div className="tg-modal-backdrop">
          <div className="tg-modal max-w-2xl tg-scale-in">
            <div className="p-6 border-b border-telegram-border">
              <h3 className="tg-heading-2">Create New Template</h3>
            </div>
            
            <form onSubmit={handleAddMessage} className="p-6 space-y-4">
              <div>
                <label className="block tg-body font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  value={newMessage.name}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, name: e.target.value }))}
                  className="fluent-input"
                  placeholder="Welcome message, Product announcement, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block tg-body font-medium mb-2">Message Content</label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                  className="fluent-textarea h-40"
                  placeholder="Write your message content here..."
                  required
                />
                <p className="tg-caption mt-1">
                  {newMessage.content.length} characters
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newMessage.is_active}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="tg-body">Active template</label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="fluent-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.add || !newMessage.name || !newMessage.content}
                  className="fluent-btn-primary flex-1"
                >
                  {actionLoading.add && <div className="tg-spinner mr-2" />}
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="tg-modal-backdrop">
          <div className="tg-modal max-w-2xl tg-scale-in">
            <div className="p-6 border-b border-telegram-border">
              <h3 className="tg-heading-2">Edit Template</h3>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateMessage(editingMessage.id, {
                  name: editingMessage.name,
                  content: editingMessage.content,
                  is_active: editingMessage.is_active
                });
                setEditingMessage(null);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block tg-body font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  value={editingMessage.name}
                  onChange={(e) => setEditingMessage(prev => ({ ...prev, name: e.target.value }))}
                  className="fluent-input"
                  required
                />
              </div>
              
              <div>
                <label className="block tg-body font-medium mb-2">Message Content</label>
                <textarea
                  value={editingMessage.content}
                  onChange={(e) => setEditingMessage(prev => ({ ...prev, content: e.target.value }))}
                  className="fluent-textarea h-40"
                  required
                />
                <p className="tg-caption mt-1">
                  {editingMessage.content.length} characters
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editingMessage.is_active}
                  onChange={(e) => setEditingMessage(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="edit_is_active" className="tg-body">Active template</label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingMessage(null)}
                  className="fluent-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading[editingMessage.id]}
                  className="fluent-btn-primary flex-1"
                >
                  {actionLoading[editingMessage.id] && <div className="tg-spinner mr-2" />}
                  Update Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageManager;