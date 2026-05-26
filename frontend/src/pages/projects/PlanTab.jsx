import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import api from '../../api/client';

const PLAN_STATUS_COLORS = {
  待开始: { bg: '#f1f5f9', color: '#64748b' },
  进行中: { bg: '#eff6ff', color: '#2563eb' },
  已完成: { bg: '#ecfdf5', color: '#059669' },
  已延迟: { bg: '#fef2f2', color: '#ef4444' },
};

const EMPTY_FORM = {
  phase_name: '',
  primary_task: '',
  secondary_task: '',
  dependency: '',
  duration: '',
  progress_pct: 0,
  description: '',
  planned_start: '',
  planned_end: '',
  actual_start: '',
  actual_end: '',
  status: '待开始',
  assignee: '',
};

function pickDownloadName(contentDisposition) {
  if (!contentDisposition) return '项目开发计划.xlsx';
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || '项目开发计划.xlsx';
}

const PlanTab = ({ projectId, members, canManage }) => {
  const fileInputRef = useRef(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

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
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      phase_name: item.phase_name || '',
      primary_task: item.primary_task || '',
      secondary_task: item.secondary_task || '',
      dependency: item.dependency || '',
      duration: item.duration || '',
      progress_pct: item.progress_pct || 0,
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
        primary_task: form.primary_task || null,
        secondary_task: form.secondary_task || null,
        dependency: form.dependency || null,
        duration: form.duration || null,
        progress_pct: Number(form.progress_pct || 0),
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

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/projects/${projectId}/plans/import`, formData);
      setNotice(`导入完成：新增 ${response.data.created_count} 条，跳过 ${response.data.skipped_count} 行`);
      await fetchPlans();
    } catch (err) {
      setError(err.response?.data?.detail || '导入失败');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setNotice('');
    try {
      const response = await api.get(`/projects/${projectId}/plans/export`, {
        responseType: 'blob',
      });
      const filename = pickDownloadName(response.headers['content-disposition']);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice('项目计划已导出');
    } catch (err) {
      setError(err.response?.data?.detail || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="plan-alert plan-alert-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="plan-alert plan-alert-success">
          {notice}
        </div>
      )}

      <div className="plan-toolbar">
        <div className="plan-toolbar-left">
          <FileSpreadsheet size={18} />
          <div>
            <strong>项目开发计划</strong>
            <span>支持按模板导入 Excel，并导出为项目开发计划 sheet 格式</span>
          </div>
        </div>
        <div className="plan-toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={exporting}>
            <Download size={16} />
            {exporting ? '导出中...' : '导出 Excel'}
          </button>
          {canManage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload size={16} />
                {importing ? '导入中...' : '导入 Excel'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <Plus size={16} />
                新增计划
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={24} /></div>
            <div className="empty-state-title">暂无计划</div>
            <div className="empty-state-description">当前项目还没有阶段计划，可新增或从 Excel 导入</div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table plan-table">
            <thead>
              <tr>
                <th>阶段</th>
                <th>一级任务</th>
                <th>二级任务</th>
                <th>状态</th>
                <th>进度</th>
                <th>工期</th>
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
                    <div className="plan-phase-name">{item.phase_name}</div>
                    {item.dependency && (
                      <div className="plan-muted-text">依赖：{item.dependency}</div>
                    )}
                  </td>
                  <td>{item.primary_task || '-'}</td>
                  <td>
                    <div>{item.secondary_task || '-'}</div>
                    {item.description && (
                      <div className="plan-muted-text">{item.description}</div>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: PLAN_STATUS_COLORS[item.status]?.bg || '#f1f5f9',
                        color: PLAN_STATUS_COLORS[item.status]?.color || '#64748b',
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="plan-progress-cell">
                      <strong>{item.progress_pct || 0}%</strong>
                      <div className="plan-progress-bar">
                        <span style={{ width: `${item.progress_pct || 0}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>{item.duration || '-'}</td>
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
              <div className="plan-form-grid">
                <div>
                  <label className="form-label">阶段 *</label>
                  <input className="input" value={form.phase_name} onChange={(event) => handleChange('phase_name', event.target.value)} placeholder="如：需求设计" />
                </div>
                <div>
                  <label className="form-label">一级任务</label>
                  <input className="input" value={form.primary_task} onChange={(event) => handleChange('primary_task', event.target.value)} placeholder="如：方案设计" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">二级任务</label>
                  <input className="input" value={form.secondary_task} onChange={(event) => handleChange('secondary_task', event.target.value)} placeholder="如：并行刷写方案" />
                </div>
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
                  <label className="form-label">工期</label>
                  <input className="input" value={form.duration} onChange={(event) => handleChange('duration', event.target.value)} placeholder="如：6d" />
                </div>
                <div>
                  <label className="form-label">当前进度</label>
                  <input className="input" type="number" min="0" max="100" value={form.progress_pct} onChange={(event) => handleChange('progress_pct', event.target.value)} />
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">依赖项</label>
                  <input className="input" value={form.dependency} onChange={(event) => handleChange('dependency', event.target.value)} placeholder="关联依赖项管理 Sheet 序列号" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">备注</label>
                  <textarea className="textarea" value={form.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="备注" />
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
