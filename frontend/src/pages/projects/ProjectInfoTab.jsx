import { useEffect, useState } from 'react';
import api from '../../api/client';

const PRIORITY_COLORS = {
  高: { bg: '#fef2f2', color: '#ef4444' },
  中: { bg: '#fffbeb', color: '#b45309' },
  低: { bg: '#ecfdf5', color: '#059669' },
};

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'git+ssh:', 'ssh:'];

function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

const ProjectInfoTab = ({
  project,
  members,
  canManage,
  onUpdate,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ ...project });

  useEffect(() => {
    setForm({ ...project });
  }, [project]);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('项目名称不能为空');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        project_manager: form.project_manager || null,
        client_name: form.client_name || null,
        start_date: form.start_date || null,
        planned_end_date: form.planned_end_date || null,
        actual_end_date: form.actual_end_date || null,
        git_url: form.git_url || null,
      };
      await api.put(`/projects/${project.id}`, payload);
      setNotice('项目信息已更新');
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.detail || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const fieldRow = (label, value) => (
    <div style={{ display: 'flex', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 140, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, color: 'var(--text-primary)' }}>{value || '-'}</div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">基本信息</span>
        {canManage && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {error && (
              <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</span>
            )}
            {notice && (
              <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>{notice}</span>
            )}
            {!editing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                编辑
              </button>
            ) : (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditing(false);
                    setForm({ ...project });
                  }}
                >
                  取消
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="card-body">
        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">项目名称</label>
              <input className="input" value={form.name} onChange={(event) => handleChange('name', event.target.value)} />
            </div>
            <div>
              <label className="form-label">状态</label>
              <select className="select" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                {['规划中', '进行中', '已暂停', '已完成', '已取消'].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">优先级</label>
              <select className="select" value={form.priority} onChange={(event) => handleChange('priority', event.target.value)}>
                {['高', '中', '低'].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">项目负责人</label>
              <select className="select" value={form.project_manager || ''} onChange={(event) => handleChange('project_manager', event.target.value)}>
                <option value="">未分配</option>
                {members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">客户名称</label>
              <input className="input" value={form.client_name || ''} onChange={(event) => handleChange('client_name', event.target.value)} />
            </div>
            <div>
              <label className="form-label">开始日期</label>
              <input className="input" type="date" value={form.start_date || ''} onChange={(event) => handleChange('start_date', event.target.value)} />
            </div>
            <div>
              <label className="form-label">计划结束日期</label>
              <input className="input" type="date" value={form.planned_end_date || ''} onChange={(event) => handleChange('planned_end_date', event.target.value)} />
            </div>
            <div>
              <label className="form-label">实际结束日期</label>
              <input className="input" type="date" value={form.actual_end_date || ''} onChange={(event) => handleChange('actual_end_date', event.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Git 仓库链接</label>
              <input className="input" value={form.git_url || ''} onChange={(event) => handleChange('git_url', event.target.value)} placeholder="https://github.com/..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">项目描述</label>
              <textarea className="textarea" value={form.description || ''} onChange={(event) => handleChange('description', event.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            {fieldRow('项目名称', project.name)}
            {fieldRow('状态',
              <span className={`status-badge status-${({ 规划中: 'researching', 进行中: 'in-progress', 已完成: 'completed', 已暂停: 'paused', 已取消: 'cancelled' })[project.status] || 'default'}`}>
                {project.status}
              </span>)}
            {fieldRow('优先级',
              <span
                className="badge"
                style={{
                  backgroundColor: PRIORITY_COLORS[project.priority]?.bg || '#f1f5f9',
                  color: PRIORITY_COLORS[project.priority]?.color || '#64748b',
                }}
              >
                {project.priority}
              </span>)}
            {fieldRow('项目负责人', project.project_manager)}
            {fieldRow('客户名称', project.client_name)}
            {fieldRow('开始日期', project.start_date)}
            {fieldRow('计划结束日期', project.planned_end_date)}
            {fieldRow('实际结束日期', project.actual_end_date || '未结束')}
            {fieldRow('Git 仓库', project.git_url && isSafeUrl(project.git_url) ? (
              <a href={project.git_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                {project.git_url}
              </a>
            ) : '-')}
            {fieldRow('描述', project.description)}
            {fieldRow('创建时间', new Date(project.created_at).toLocaleString('zh-CN'))}
            {fieldRow('更新时间', new Date(project.updated_at).toLocaleString('zh-CN'))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInfoTab;
