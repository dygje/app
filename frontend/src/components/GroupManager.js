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
      alert('Failed to load groups. Please refresh the page.');
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
      alert(editingGroup ? 'Failed to update group' : 'Failed to create group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setBulkLoading(true);
    try {
      const identifiers = bulkText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      await axios.post('/groups/bulk', { identifiers });
      await loadGroups();
      setShowBulkModal(false);
      setBulkText('');
      alert(`Successfully imported ${identifiers.length} groups`);
    } catch (error) {
      console.error('Failed to bulk import groups:', error);
      alert('Failed to import groups. Please check the format and try again.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBulkText(event.target.result);
      };
      reader.readAsText(file);
    }
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
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await axios.delete(`/groups/${groupId}`);
      await loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({ group_identifier: '', is_active: true });
    setActionLoading(false);
  };

  const getGroupTypeIcon = (type) => {
    switch (type) {
      case 'username': return 'alternate_email';
      case 'group_id': return 'numbers';
      case 'invite_link': return 'link';
      default: return 'group';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="material-fade-in">
          <div className="mb-6">
            <div className="h-8 bg-surface-200 rounded-md w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-surface-100 rounded w-64 animate-pulse"></div>
          </div>
          
          <div className="material-card-filled p-6 animate-pulse">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-surface-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-200 rounded w-1/2"></div>
                    <div className="h-3 bg-surface-100 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 w-16 bg-surface-200 rounded"></div>
                </div>
              ))}
            </div>
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
            Group Management
          </h1>
          <p className="text-body-large text-surface-600">
            Manage target groups for your automation system
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Bulk Import Button */}
          <button
            onClick={() => setShowBulkModal(true)}
            className="material-button-outlined"
          >
            <span className="material-icons mr-2">upload_file</span>
            Bulk Import
          </button>

          {/* Add Group Button */}
          <button
            onClick={() => setShowModal(true)}
            className="material-button-filled"
          >
            <span className="material-icons mr-2">add</span>
            Add Group
          </button>
        </div>
      </div>

      {/* Material Design Stats Cards */}
      <div className="material-grid material-grid-cols-3">
        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-primary-700 text-xl">groups</span>
            </div>
            <div>
              <h3 className="text-title-large font-medium text-surface-900">
                {groups.length}
              </h3>
              <p className="text-body-medium text-surface-600">Total Groups</p>
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
                {groups.filter(g => g.is_active).length}
              </h3>
              <p className="text-body-medium text-surface-600">Active Groups</p>
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
                {groups.filter(g => !g.is_active).length}
              </h3>
              <p className="text-body-medium text-surface-600">Inactive Groups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Material Design Groups List */}
      <div className="material-card-elevated">
        <div className="px-6 py-4 border-b border-surface-200">
          <div className="flex items-center justify-between">
            <h2 className="text-title-large font-medium text-surface-900">
              Groups ({groups.length})
            </h2>
            <div className="flex items-center space-x-2">
              <span className="material-icons text-surface-500 text-lg">search</span>
              <span className="text-body-medium text-surface-500">Search coming soon</span>
            </div>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-surface-500 text-2xl">group_add</span>
            </div>
            <h3 className="text-title-medium text-surface-900 mb-2">No groups yet</h3>
            <p className="text-body-medium text-surface-600 mb-6">
              Start by adding your first Telegram group or importing multiple groups at once
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setShowModal(true)}
                className="material-button-filled"
              >
                <span className="material-icons mr-2">add</span>
                Add First Group
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="material-button-outlined"
              >
                <span className="material-icons mr-2">upload_file</span>
                Bulk Import
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {groups.map((group) => (
              <div
                key={group.id}
                className="material-list-item p-6 hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Group Type Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    group.is_active ? 'bg-primary-100' : 'bg-surface-100'
                  }`}>
                    <span className={`material-icons ${
                      group.is_active ? 'text-primary-700' : 'text-surface-500'
                    }`}>
                      {getGroupTypeIcon(group.group_type)}
                    </span>
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-title-small font-medium text-surface-900 truncate">
                        {group.parsed_name || 'Unknown Group'}
                      </h3>
                      <div className={`material-badge-${group.is_active ? 'success' : 'warning'}`}>
                        {group.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-body-small text-surface-600">
                      <span className="flex items-center">
                        <span className="material-icons text-xs mr-1">category</span>
                        {group.group_type}
                      </span>
                      <span className="flex items-center">
                        <span className="material-icons text-xs mr-1">link</span>
                        {group.group_identifier}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(group)}
                      className="material-button-text p-2"
                      title="Edit Group"
                    >
                      <span className="material-icons text-lg">edit</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="material-button-text p-2 text-error-600 hover:bg-error-50"
                      title="Delete Group"
                    >
                      <span className="material-icons text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Material Design Add/Edit Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 material-dialog-backdrop">
          <div className="material-dialog w-full max-w-md material-scale-in">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title-large font-medium text-surface-900">
                  {editingGroup ? 'Edit Group' : 'Add New Group'}
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
                    value={formData.group_identifier}
                    onChange={(e) => setFormData({...formData, group_identifier: e.target.value})}
                    className="material-textfield-input peer"
                    placeholder=" "
                    required
                  />
                  <label className="material-textfield-label">
                    Group Identifier
                  </label>
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
                    Active group (will receive messages)
                  </label>
                </div>

                <div className="material-card-outlined bg-primary-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="material-icons text-primary-600 text-lg mt-0.5">info</span>
                    <div>
                      <h4 className="text-title-small font-medium text-primary-800 mb-1">
                        Supported Formats
                      </h4>
                      <div className="text-body-small text-primary-700 space-y-1">
                        <p>• @username (public groups/channels)</p>
                        <p>• https://t.me/groupname</p>
                        <p>• -1001234567890 (group ID)</p>
                        <p>• https://t.me/joinchat/xxx (invite links)</p>
                      </div>
                    </div>
                  </div>
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
                      {editingGroup ? 'save' : 'add'}
                    </span>
                    {editingGroup ? 'Update' : 'Add Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Material Design Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 material-dialog-backdrop">
          <div className="material-dialog w-full max-w-2xl material-scale-in">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title-large font-medium text-surface-900">
                  Bulk Import Groups
                </h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="material-button-text p-2 -mr-2"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-body-large font-medium text-surface-900">
                      Import Method
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="material-button-outlined"
                    >
                      <span className="material-icons mr-2">upload</span>
                      Upload File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="material-textfield">
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className="material-textfield-input peer min-h-48 resize-vertical"
                      placeholder=" "
                      required
                    />
                    <label className="material-textfield-label">
                      Group Identifiers (one per line)
                    </label>
                  </div>
                </div>

                <div className="material-card-outlined bg-secondary-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="material-icons text-secondary-600 text-lg mt-0.5">lightbulb</span>
                    <div>
                      <h4 className="text-title-small font-medium text-secondary-800 mb-1">
                        Import Tips
                      </h4>
                      <div className="text-body-small text-secondary-700 space-y-1">
                        <p>• Enter one group identifier per line</p>
                        <p>• Mix different formats (usernames, IDs, links)</p>
                        <p>• Empty lines and duplicates will be ignored</p>
                        <p>• Upload .txt or .csv files for easier import</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="material-button-outlined"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkLoading || !bulkText.trim()}
                    className={`material-button-filled ${bulkLoading ? 'material-loading' : ''}`}
                  >
                    {bulkLoading && <div className="material-spinner mr-2" />}
                    <span className="material-icons mr-2">upload_file</span>
                    Import Groups
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Material Design FAB for Quick Add */}
      <button 
        onClick={() => setShowModal(true)}
        className="material-fab"
        title="Quick Add Group"
      >
        <span className="material-icons">add</span>
      </button>
    </div>
  );
};

export default GroupManager;