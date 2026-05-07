import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';

const PRIORITY_COLORS = {
  高: { bg: '#fef2f2', color: '#ef4444' },
  中: { bg: '#fffbeb', color: '#b45309' },
  低: { bg: '#ecfdf5', color: '#059669' },
};

const REQ_STATUS_COLORS = {
  待评审: { bg: '#f1f5f9', color: '#64748b' },
  已评审: { bg: '#eff6ff', color: '#2563eb' },
  开发中: { bg: '#fffbeb', color: '#b45309' },
  已完成: { bg: '#ecfdf5', color: '#059669' },
  已关闭: { bg: '#f1f5f9', color: '#94a3b8' },
};

const RequirementTab = ({ projectId, members, canManage }) => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    req_id: '',
    title: '',
    description: '',
    priority: '中',
    status: '待评审',
    owner: '',
  });

  const fetchRequirements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}/requirements`);
      setRequirements(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '加载需求失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      req_id: '',
      title: '',
      description: '',
      priority: '中',
      status: '待评审',
      owner: '',
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      req_id: item.req_id || '',
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      status: item.status,
      owner: item.owner || '',
    });
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('请输入需求标题');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        req_id: form.req_id || null,
        owner: form.owner || null,
      };
      if (editingId) {
        await api.put(`/projects/requirements/${editingId}`, payload);
        setNotice('需求已更新');
      } else {
        await api.post(`/projects/${projectId}/requirements`, payload);
        setNotice('需求已创建');
      }
      setShowModal(false);
      await fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除此需求？')) return;
    try {
      await api.delete(`/projects/requirements/${id}`);
      setNotice('需求已删除');
      await fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.detail || '删除失败');
    }
  };

  return (
    <div>
      {error && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--error-light)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-4)' }}>
          {notice}
        </div>
      )}

      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={16} /> 新增需求
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : requirements.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Plus size={24} /></div>
            <div className="empty-state-title">暂无需求</div>
            <div className="empty-state-description">当前项目还没有需求记录</div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>需求标题</th>
                <th>优先级</th>
                <th>状态</th>
                <th>负责人</th>
                {canManage && <th style={{ width: 80 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {requirements.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="text-mono-sm" style={{ fontWeight: 600 }}>
                      {item.req_id || '-'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: PRIORITY_COLORS[item.priority]?.bg || '#f1f5f9',
                      color: PRIORITY_COLORS[item.priority]?.color || '#64748b',
                    }}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: REQ_STATUS_COLORS[item.status]?.bg || '#f1f5f9',
                      color: REQ_STATUS_COLORS[item.status]?.color || '#64748b',
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.owner || '-'}</td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="编辑">
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(item.id)} title="删除" style={{ color: 'var(--error)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? '编辑需求' : '新增需求'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">需求编号</label>
                    <input className="input" value={form.req_id} onChange={(event) => handleChange('req_id', event.target.value)} placeholder="REQ-001" />
                  </div>
                  <div>
                    <label className="form-label">负责人</label>
                    <select className="select" value={form.owner} onChange={(event) => handleChange('owner', event.target.value)}>
                      <option value="">未分配</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.name}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">需求标题 *</label>
                  <input className="input" value={form.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="输入需求标题" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">优先级</label>
                    <select className="select" value={form.priority} onChange={(event) => handleChange('priority', event.target.value)}>
                      {['高', '中', '低'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">状态</label>
                    <select className="select" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                      {['待评审', '已评审', '开发中', '已完成', '已关闭'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">需求描述</label>
                  <textarea className="textarea" value={form.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="描述" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
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

export default RequirementTab;
