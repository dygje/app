import { useState, useEffect } from 'react';
import axios from 'axios';

const GroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    group_identifier: '',
    is_active: true
  });
  const [bulkData, setBulkData] = useState('');

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
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    setActionLoading({add: true});
    
    try {
      await axios.post('/groups', newGroup);
      setNewGroup({ group_identifier: '', is_active: true });
      setShowAddModal(false);
      loadGroups();
    } catch (error) {
      console.error('Failed to add group:', error);
      alert('Failed to add group. Please try again.');
    } finally {
      setActionLoading({});
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setActionLoading({bulk: true});
    
    try {
      const groupList = bulkData.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      await axios.post('/groups/bulk', { groups: groupList });
      setBulkData('');
      setShowBulkModal(false);
      loadGroups();
    } catch (error) {
      console.error('Failed to bulk import:', error);
      alert('Failed to import groups. Please check your format and try again.');
    } finally {
      setActionLoading({});
    }
  };

  const handleUpdateGroup = async (groupId, updates) => {
    setActionLoading({[groupId]: true});
    
    try {
      await axios.put(`/groups/${groupId}`, updates);
      loadGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group. Please try again.');
    } finally {
      setActionLoading({});
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    setActionLoading({[groupId]: true});
    
    try {
      await axios.delete(`/groups/${groupId}`);
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    } finally {
      setActionLoading({});
    }
  };

  const getGroupTypeIcon = (type) => {
    switch (type) {
      case 'username': return 'alternate_email';
      case 'group_id': return 'numbers';
      case 'invite_link': return 'link';
      default: return 'group';
    }
  };

  const getGroupTypeColor = (type) => {
    switch (type) {
      case 'username': return 'text-telegram-blue';
      case 'group_id': return 'text-telegram-green';
      case 'invite_link': return 'text-telegram-orange';
      default: return 'text-telegram-textMuted';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 tg-fade-in">
        <div className="tg-card-elevated p-6 animate-pulse">
          <div className="h-8 bg-telegram-elevated rounded-telegram w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-telegram-elevated rounded-telegram"></div>
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
          <h1 className="tg-heading-1 mb-2">Group Management</h1>
          <p className="tg-body-secondary">Manage your Telegram groups and channels</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="fluent-btn-secondary"
          >
            <span className="material-icons mr-2 text-sm">upload_file</span>
            Bulk Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="fluent-btn-primary"
          >
            <span className="material-icons mr-2 text-sm">add</span>
            Add Group
          </button>
        </div>
      </div>

      {/* Groups List */}
      <div className="tg-card-elevated">
        <div className="p-6 border-b border-telegram-border">
          <h2 className="tg-heading-2">Groups ({groups.length})</h2>
        </div>
        
        <div className="p-6">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-icons text-6xl text-telegram-textMuted mb-4 block">groups</span>
              <h3 className="tg-heading-3 mb-2">No groups added yet</h3>
              <p className="tg-body-secondary mb-6">Add your first group to start automation</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="fluent-btn-primary"
              >
                <span className="material-icons mr-2 text-sm">add</span>
                Add Your First Group
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="tg-card p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-telegram-blue bg-opacity-20 rounded-telegram flex items-center justify-center">
                      <span className={`material-icons text-lg ${getGroupTypeColor(group.group_type)}`}>
                        {getGroupTypeIcon(group.group_type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="tg-body font-medium truncate">{group.parsed_name || group.group_identifier}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="tg-caption">{group.group_type}</span>
                        <div className={`tg-status-${group.is_active ? 'online' : 'offline'}`}></div>
                        <span className="tg-caption">{group.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUpdateGroup(group.id, { is_active: !group.is_active })}
                      disabled={actionLoading[group.id]}
                      className="fluent-btn-ghost p-2"
                    >
                      <span className="material-icons text-sm">
                        {group.is_active ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setEditingGroup(group)}
                      disabled={actionLoading[group.id]}
                      className="fluent-btn-ghost p-2"
                    >
                      <span className="material-icons text-sm">edit</span>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={actionLoading[group.id]}
                      className="fluent-btn-ghost p-2 text-telegram-red hover:text-red-400"
                    >
                      <span className="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="tg-modal-backdrop">
          <div className="tg-modal tg-scale-in">
            <div className="p-6 border-b border-telegram-border">
              <h3 className="tg-heading-2">Add New Group</h3>
            </div>
            
            <form onSubmit={handleAddGroup} className="p-6 space-y-4">
              <div>
                <label className="block tg-body font-medium mb-2">Group Identifier</label>
                <input
                  type="text"
                  value={newGroup.group_identifier}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, group_identifier: e.target.value }))}
                  className="fluent-input"
                  placeholder="@username, t.me/group, or group ID"
                  required
                />
                <p className="tg-caption mt-1">
                  Enter username, invite link, or group ID - we'll auto-detect the type
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newGroup.is_active}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="tg-body">Active</label>
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
                  disabled={actionLoading.add || !newGroup.group_identifier}
                  className="fluent-btn-primary flex-1"
                >
                  {actionLoading.add && <div className="tg-spinner mr-2" />}
                  Add Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="tg-modal-backdrop">
          <div className="tg-modal tg-scale-in">
            <div className="p-6 border-b border-telegram-border">
              <h3 className="tg-heading-2">Bulk Import Groups</h3>
            </div>
            
            <form onSubmit={handleBulkImport} className="p-6 space-y-4">
              <div>
                <label className="block tg-body font-medium mb-2">Groups (one per line)</label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="fluent-textarea h-32"
                  placeholder="@username1&#10;https://t.me/group2&#10;-1001234567890&#10;https://t.me/joinchat/xyz"
                  required
                />
                <p className="tg-caption mt-1">
                  Enter groups in any format - usernames, links, or IDs. One per line.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="fluent-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.bulk || !bulkData.trim()}
                  className="fluent-btn-primary flex-1"
                >
                  {actionLoading.bulk && <div className="tg-spinner mr-2" />}
                  Import Groups
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="tg-modal-backdrop">
          <div className="tg-modal tg-scale-in">
            <div className="p-6 border-b border-telegram-border">
              <h3 className="tg-heading-2">Edit Group</h3>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateGroup(editingGroup.id, {
                  group_identifier: editingGroup.group_identifier,
                  is_active: editingGroup.is_active
                });
                setEditingGroup(null);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block tg-body font-medium mb-2">Group Identifier</label>
                <input
                  type="text"
                  value={editingGroup.group_identifier}
                  onChange={(e) => setEditingGroup(prev => ({ ...prev, group_identifier: e.target.value }))}
                  className="fluent-input"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editingGroup.is_active}
                  onChange={(e) => setEditingGroup(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="edit_is_active" className="tg-body">Active</label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="fluent-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading[editingGroup.id]}
                  className="fluent-btn-primary flex-1"
                >
                  {actionLoading[editingGroup.id] && <div className="tg-spinner mr-2" />}
                  Update Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManager;