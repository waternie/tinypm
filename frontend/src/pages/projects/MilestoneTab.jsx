import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';

const MILESTONE_STATUS_COLORS = {
  待开始: { bg: '#f1f5f9', color: '#64748b' },
  进行中: { bg: '#eff6ff', color: '#2563eb' },
  已完成: { bg: '#ecfdf5', color: '#059669' },
  已延迟: { bg: '#fef2f2', color: '#ef4444' },
};

const MilestoneTab = ({ projectId, canManage }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    planned_date: '',
    actual_date: '',
    progress_pct: 0,
    status: '待开始',
  });

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}/milestones`);
      setMilestones(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '加载里程碑失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', planned_date: '', actual_date: '', progress_pct: 0, status: '待开始' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      planned_date: item.planned_date || '',
      actual_date: item.actual_date || '',
      progress_pct: item.progress_pct,
      status: item.status,
    });
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('请输入里程碑名称');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        planned_date: form.planned_date || null,
        actual_date: form.actual_date || null,
      };
      if (editingId) {
        await api.put(`/projects/milestones/${editingId}`, payload);
        setNotice('里程碑已更新');
      } else {
        await api.post(`/projects/${projectId}/milestones`, payload);
        setNotice('里程碑已创建');
      }
      setShowModal(false);
      await fetchMilestones();
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除此里程碑？')) return;
    try {
      await api.delete(`/projects/milestones/${id}`);
      setNotice('里程碑已删除');
      await fetchMilestones();
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
            <Plus size={16} /> 新增里程碑
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={24} /></div>
            <div className="empty-state-title">暂无里程碑</div>
            <div className="empty-state-description">当前项目还没有关键节点</div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>里程碑名称</th>
                <th>状态</th>
                <th>计划日期</th>
                <th>实际日期</th>
                <th>进度</th>
                {canManage && <th style={{ width: 80 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {milestones.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: MILESTONE_STATUS_COLORS[item.status]?.bg || '#f1f5f9',
                      color: MILESTONE_STATUS_COLORS[item.status]?.color || '#64748b',
                    }}>
                      {item.status === '已完成' ? <CheckCircle2 size={12} /> : null}
                      {item.status === '进行中' ? <Circle size={12} /> : null}
                      {item.status === '已延迟' ? <Clock size={12} /> : null}
                      {item.status}
                    </span>
                  </td>
                  <td>{item.planned_date || '-'}</td>
                  <td>{item.actual_date || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--bg-surface-secondary)', overflow: 'hidden' }}>
                        <div style={{ width: `${item.progress_pct}%`, height: '100%', backgroundColor: item.progress_pct === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span className="text-mono-sm">{item.progress_pct}%</span>
                    </div>
                  </td>
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
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? '编辑里程碑' : '新增里程碑'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">名称 *</label>
                  <input className="input" value={form.name} onChange={(event) => handleChange('name', event.target.value)} placeholder="里程碑名称" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">状态</label>
                    <select className="select" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                      {['待开始', '进行中', '已完成', '已延迟'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">进度 %</label>
                    <input className="input" type="number" min={0} max={100} value={form.progress_pct} onChange={(event) => handleChange('progress_pct', Number(event.target.value))} />
                  </div>
                  <div>
                    <label className="form-label">计划日期</label>
                    <input className="input" type="date" value={form.planned_date} onChange={(event) => handleChange('planned_date', event.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">实际日期</label>
                    <input className="input" type="date" value={form.actual_date} onChange={(event) => handleChange('actual_date', event.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">描述</label>
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

export default MilestoneTab;
