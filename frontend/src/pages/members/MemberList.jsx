import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import api from '../../api/client';
import { canManageProjects, getStoredUser } from '../../utils/auth';

const MemberList = () => {
  const currentUser = getStoredUser();
  const canManage = canManageProjects(currentUser);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/members');
      setMembers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '获取成员列表失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openCreateModal = () => {
    setEditingMember(null);
    setFormName('');
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setFormName(member.name);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingMember(null);
    setFormName('');
  };

  const handleSave = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setError('请输入成员姓名');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingMember) {
        await api.put(`/members/${editingMember.id}`, { name: trimmedName });
        setNotice('成员信息已更新');
      } else {
        await api.post('/members', { name: trimmedName });
        setNotice('成员已创建');
      }
      closeModal();
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.detail || '保存成员失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    const confirmed = window.confirm(`确定要删除成员“${memberName}”吗？`);
    if (!confirmed) return;

    setDeletingId(memberId);
    setError('');
    setNotice('');
    try {
      await api.delete(`/members/${memberId}`);
      setNotice('成员已删除');
      setMembers((previous) => previous.filter((item) => item.id !== memberId));
    } catch (err) {
      setError(err.response?.data?.detail || '删除成员失败');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">成员库</h1>
          <p className="page-description">
            维护项目负责人、需求负责人和问题指派人的可选成员名单
          </p>
        </div>
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            <UserPlus size={16} />
            新增成员
          </button>
        )}
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
        <div className="flex justify-center items-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={24} />
          </div>
          <h3 className="empty-state-title">成员库为空</h3>
          <p className="empty-state-description">
            {canManage ? '点击“新增成员”建立可分配人员名单' : '当前平台还没有可分配成员'}
          </p>
          {canManage && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={openCreateModal}
            >
              <UserPlus size={16} />
              新增成员
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {members.map((member) => (
            <div className="card" key={member.id}>
              <div className="card-body">
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {member.name}
                      </div>
                      <div className="text-caption">
                        创建于 {formatDate(member.created_at)}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => openEditModal(member)}
                        title="编辑成员"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ color: 'var(--error)' }}
                        disabled={deletingId === member.id}
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        title="删除成员"
                      >
                        {deletingId === member.id ? (
                          <span className="spinner spinner-sm" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingMember ? '编辑成员' : '新增成员'}</span>
              <button className="modal-close" onClick={closeModal} disabled={saving}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">成员姓名</label>
              <input
                type="text"
                className="input"
                placeholder="请输入成员姓名"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                autoFocus
                maxLength={64}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                取消
              </button>
              <button
                className="btn btn-primary"
                disabled={saving || !formName.trim()}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: '#ffffff' }} />
                    保存中...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    {editingMember ? '保存' : '创建'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberList;
