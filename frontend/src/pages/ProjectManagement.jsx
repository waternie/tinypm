import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Kanban,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import api from '../api/client';
import useMembers from '../hooks/useMembers';
import { canManageProjects, getStoredUser } from '../utils/auth';

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'git+ssh:', 'ssh:'];

const PRIORITY_COLORS = {
  高: { bg: '#fef2f2', color: '#ef4444' },
  中: { bg: '#fffbeb', color: '#b45309' },
  低: { bg: '#ecfdf5', color: '#059669' },
};

const STATUS_OPTIONS = ['全部', '规划中', '进行中', '已暂停', '已完成', '已取消'];
const PRIORITY_OPTIONS = ['全部', '高', '中', '低'];

function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

const ProjectManagement = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const canManage = canManageProjects(currentUser);
  const { members } = useMembers();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [priorityFilter, setPriorityFilter] = useState('全部');
  const [managerFilter, setManagerFilter] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    status: '规划中',
    priority: '中',
    description: '',
    project_manager: '',
    client_name: '',
    git_url: '',
    start_date: '',
    planned_end_date: '',
    actual_end_date: '',
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== '全部') params.status = statusFilter;
      if (priorityFilter !== '全部') params.priority = priorityFilter;
      if (managerFilter !== '全部') params.project_manager = managerFilter;
      const response = await api.get('/projects', { params });
      setProjects(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [managerFilter, priorityFilter, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return projects;
    return projects.filter((project) => (
      project.name.toLowerCase().includes(keyword)
      || (project.description || '').toLowerCase().includes(keyword)
      || (project.client_name || '').toLowerCase().includes(keyword)
      || (project.project_manager || '').toLowerCase().includes(keyword)
    ));
  }, [projects, searchText]);

  const openCreateModal = () => {
    setForm({
      name: '',
      status: '规划中',
      priority: '中',
      description: '',
      project_manager: '',
      client_name: '',
      git_url: '',
      start_date: '',
      planned_end_date: '',
      actual_end_date: '',
    });
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('请输入项目名称');
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
        git_url: form.git_url || null,
        start_date: form.start_date || null,
        planned_end_date: form.planned_end_date || null,
        actual_end_date: form.actual_end_date || null,
      };
      await api.post('/projects', payload);
      setNotice('项目创建成功');
      setShowModal(false);
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || '创建项目失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    const confirmed = window.confirm(`确定要删除项目“${projectName}”吗？所有关联数据将被级联删除。`);
    if (!confirmed) return;

    try {
      await api.delete(`/projects/${projectId}`);
      setNotice('项目已删除');
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || '删除项目失败');
    }
  };

  const clearFilters = () => {
    setStatusFilter('全部');
    setPriorityFilter('全部');
    setManagerFilter('全部');
    setSearchText('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">项目管理</h1>
          <p className="page-description">按负责人、状态和优先级筛选项目，并统一维护计划、需求与问题</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            新建项目
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

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div
          className="card-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <div className="input-group" style={{ flex: 1, minWidth: 220 }}>
            <span className="input-icon"><Search size={16} /></span>
            <input
              className="input"
              placeholder="搜索项目名、描述、客户或负责人"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: 120 }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === '全部' ? '全部状态' : option}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 132 }}
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === '全部' ? '全部优先级' : option}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 132 }}
            value={managerFilter}
            onChange={(event) => setManagerFilter(event.target.value)}
          >
            <option value="全部">全部负责人</option>
            {members.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={clearFilters}>
            清空筛选
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Kanban size={24} /></div>
            <div className="empty-state-title">暂无项目</div>
            <div className="empty-state-description">
              {canManage ? '点击“新建项目”创建第一个项目' : '当前筛选条件下没有可查看的项目'}
            </div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>状态</th>
                <th>优先级</th>
                <th>负责人</th>
                <th>客户</th>
                <th>里程碑</th>
                <th>计划</th>
                <th>需求</th>
                <th>问题</th>
                <th>Git</th>
                {canManage && <th style={{ width: 80 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{project.name}</div>
                    {project.description && (
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-muted)',
                          marginTop: 2,
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {project.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${getStatusClass(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: PRIORITY_COLORS[project.priority]?.bg || '#f1f5f9',
                        color: PRIORITY_COLORS[project.priority]?.color || '#64748b',
                      }}
                    >
                      {project.priority}
                    </span>
                  </td>
                  <td>{project.project_manager || '-'}</td>
                  <td>{project.client_name || '-'}</td>
                  <td className="num">{project.milestone_count}</td>
                  <td className="num">{project.plan_count}</td>
                  <td className="num">{project.requirement_count}</td>
                  <td className="num">{project.issue_count}</td>
                  <td>
                    {project.git_url && isSafeUrl(project.git_url) ? (
                      <a
                        href={project.git_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        style={{
                          color: 'var(--accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <GitBranch size={16} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{project.git_url || '-'}</span>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(project.id, project.name);
                        }}
                        title="删除"
                        style={{ color: 'var(--error)' }}
                      >
                        <Trash2 size={16} />
                      </button>
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
              <span className="modal-title">新建项目</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">项目名称 *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    placeholder="输入项目名称"
                  />
                </div>
                <div>
                  <label className="form-label">状态</label>
                  <select className="select" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                    {STATUS_OPTIONS.filter((item) => item !== '全部').map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">优先级</label>
                  <select className="select" value={form.priority} onChange={(event) => handleChange('priority', event.target.value)}>
                    {PRIORITY_OPTIONS.filter((item) => item !== '全部').map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">项目负责人</label>
                  <select className="select" value={form.project_manager} onChange={(event) => handleChange('project_manager', event.target.value)}>
                    <option value="">未分配</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">客户名称</label>
                  <input
                    className="input"
                    value={form.client_name}
                    onChange={(event) => handleChange('client_name', event.target.value)}
                    placeholder="客户名称"
                  />
                </div>
                <div>
                  <label className="form-label">开始日期</label>
                  <input className="input" type="date" value={form.start_date} onChange={(event) => handleChange('start_date', event.target.value)} />
                </div>
                <div>
                  <label className="form-label">计划结束日期</label>
                  <input className="input" type="date" value={form.planned_end_date} onChange={(event) => handleChange('planned_end_date', event.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Git 仓库链接</label>
                  <input
                    className="input"
                    value={form.git_url}
                    onChange={(event) => handleChange('git_url', event.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">项目描述</label>
                  <textarea className="textarea" value={form.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="项目描述" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getStatusClass(status) {
  const mapping = {
    规划中: 'researching',
    进行中: 'in-progress',
    已完成: 'completed',
    已暂停: 'paused',
    已取消: 'cancelled',
  };
  return mapping[status] || 'default';
}

export default ProjectManagement;
