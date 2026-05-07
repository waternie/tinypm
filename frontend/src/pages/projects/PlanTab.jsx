import { useCallback, useEffect, useState } from 'react';
import { Calendar, Pencil, Plus, Trash2, User } from 'lucide-react';
import api from '../../api/client';

const PLAN_STATUS_COLORS = {
  待开始: { bg: '#f1f5f9', color: '#64748b' },
  进行中: { bg: '#eff6ff', color: '#2563eb' },
  已完成: { bg: '#ecfdf5', color: '#059669' },
  已延迟: { bg: '#fef2f2', color: '#ef4444' },
};

const PlanTab = ({ projectId, members, canManage }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phase_name: '',
    description: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    status: '待开始',
    assignee: '',
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}/plans`);
      setPlans(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '加载计划失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      phase_name: '',
      description: '',
      planned_start: '',
      planned_end: '',
      actual_start: '',
      actual_end: '',
      status: '待开始',
      assignee: '',
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      phase_name: item.phase_name,
      description: item.description || '',
      planned_start: item.planned_start || '',
      planned_end: item.planned_end || '',
      actual_start: item.actual_start || '',
      actual_end: item.actual_end || '',
      status: item.status,
      assignee: item.assignee || '',
    });
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.phase_name.trim()) {
      setError('请输入阶段名称');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        assignee: form.assignee || null,
        planned_start: form.planned_start || null,
        planned_end: form.planned_end || null,
        actual_start: form.actual_start || null,
        actual_end: form.actual_end || null,
      };
      if (editingId) {
        await api.put(`/projects/plans/${editingId}`, payload);
        setNotice('计划已更新');
      } else {
        await api.post(`/projects/${projectId}/plans`, payload);
        setNotice('计划已创建');
      }
      setShowModal(false);
      await fetchPlans();
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除此计划？')) return;
    try {
      await api.delete(`/projects/plans/${id}`);
      setNotice('计划已删除');
      await fetchPlans();
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
            <Plus size={16} /> 新增计划
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={24} /></div>
            <div className="empty-state-title">暂无计划</div>
            <div className="empty-state-description">当前项目还没有阶段计划</div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>阶段名称</th>
                <th>状态</th>
                <th>计划起止</th>
                <th>实际起止</th>
                <th>负责人</th>
                {canManage && <th style={{ width: 80 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {plans.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.phase_name}</div>
                    {item.description && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: PLAN_STATUS_COLORS[item.status]?.bg || '#f1f5f9',
                      color: PLAN_STATUS_COLORS[item.status]?.color || '#64748b',
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    {item.planned_start || '?'} ~ {item.planned_end || '?'}
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    {item.actual_start || '-'} ~ {item.actual_end || '-'}
                  </td>
                  <td>
                    {item.assignee ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        {item.assignee}
                      </span>
                    ) : '-'}
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
          <div className="modal-content modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? '编辑计划' : '新增计划'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">阶段名称 *</label>
                  <input className="input" value={form.phase_name} onChange={(event) => handleChange('phase_name', event.target.value)} placeholder="如：需求分析阶段" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">状态</label>
                    <select className="select" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                      {['待开始', '进行中', '已完成', '已延迟'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">负责人</label>
                    <select className="select" value={form.assignee} onChange={(event) => handleChange('assignee', event.target.value)}>
                      <option value="">未分配</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.name}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">计划开始</label>
                    <input className="input" type="date" value={form.planned_start} onChange={(event) => handleChange('planned_start', event.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">计划结束</label>
                    <input className="input" type="date" value={form.planned_end} onChange={(event) => handleChange('planned_end', event.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">实际开始</label>
                    <input className="input" type="date" value={form.actual_start} onChange={(event) => handleChange('actual_start', event.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">实际结束</label>
                    <input className="input" type="date" value={form.actual_end} onChange={(event) => handleChange('actual_end', event.target.value)} />
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

export default PlanTab;
