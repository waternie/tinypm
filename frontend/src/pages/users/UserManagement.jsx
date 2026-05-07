import { useEffect, useState } from 'react';
import { Pencil, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import api from '../../api/client';
import { getStoredUser, ROLE_LABELS } from '../../utils/auth';

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'manager', label: '项目经理' },
  { value: 'member', label: '普通成员' },
];

const UserManagement = () => {
  const currentUser = getStoredUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    password: '',
    role: 'member',
    is_active: true,
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setForm({
      username: '',
      display_name: '',
      password: '',
      role: 'member',
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      display_name: user.display_name || '',
      password: '',
      role: user.role,
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingUser(null);
    resetForm();
  };

  const updateStoredCurrentUser = (updatedUser) => {
    if (updatedUser.id !== currentUser.id) return;
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setError('创建用户时必须设置密码');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingUser) {
        const payload = {
          username: form.username.trim(),
          display_name: form.display_name.trim() || null,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        const response = await api.put(`/users/${editingUser.id}`, payload);
        updateStoredCurrentUser(response.data);
        setNotice('用户信息已更新');
      } else {
        await api.post('/users', {
          username: form.username.trim(),
          display_name: form.display_name.trim() || null,
          password: form.password.trim(),
          role: form.role,
          is_active: form.is_active,
        });
        setNotice('用户已创建');
      }

      closeModal();
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || '保存用户失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`确定要删除用户“${user.username}”吗？`);
    if (!confirmed) return;

    setDeletingId(user.id);
    setError('');
    setNotice('');
    try {
      await api.delete(`/users/${user.id}`);
      setNotice('用户已删除');
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err.response?.data?.detail || '删除用户失败');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value) => new Date(value).toLocaleString('zh-CN');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">用户管理</h1>
          <p className="page-description">
            管理平台登录账号、启用状态和权限角色
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={16} />
          新增用户
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--error-light)',
            color: 'var(--error)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: 'var(--space-4)',
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--success-light)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: 'var(--space-4)',
          }}
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>展示名称</th>
                <th>角色</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th style={{ width: 100 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>
                    {user.username}
                    {user.id === currentUser.id && (
                      <span className="text-caption" style={{ marginLeft: 8 }}>
                        当前账号
                      </span>
                    )}
                  </td>
                  <td>{user.display_name || '-'}</td>
                  <td>
                    <span className="badge badge-info">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-default'}`}>
                      {user.is_active ? '启用中' : '已停用'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.updated_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openEditModal(user)}
                        title="编辑用户"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDelete(user)}
                        title="删除用户"
                        style={{ color: 'var(--error)' }}
                        disabled={deletingId === user.id}
                      >
                        {deletingId === user.id ? (
                          <span className="spinner spinner-sm" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingUser ? '编辑用户' : '新增用户'}</span>
              <button className="modal-close" onClick={closeModal} disabled={saving}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">用户名 *</label>
                  <input
                    className="input"
                    value={form.username}
                    onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))}
                    placeholder="请输入用户名"
                  />
                </div>
                <div>
                  <label className="form-label">展示名称</label>
                  <input
                    className="input"
                    value={form.display_name}
                    onChange={(event) => setForm((previous) => ({ ...previous, display_name: event.target.value }))}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="form-label">
                    {editingUser ? '重置密码' : '登录密码 *'}
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                    placeholder={editingUser ? '留空则不修改' : '请输入密码'}
                  />
                </div>
                <div>
                  <label className="form-label">权限角色</label>
                  <select
                    className="select"
                    value={form.role}
                    onChange={(event) => setForm((previous) => ({ ...previous, role: event.target.value }))}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">账号状态</label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm((previous) => ({ ...previous, is_active: event.target.checked }))}
                    />
                    启用该账号
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
