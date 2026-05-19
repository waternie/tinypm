import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, GitBranch } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import AnnouncementTab from './AnnouncementTab';
import CostTab from './CostTab';
import DocumentTab from './DocumentTab';
import useMembers from '../../hooks/useMembers';
import { canManageProjects, getStoredUser } from '../../utils/auth';
import IssueTab from './IssueTab';
import MilestoneTab from './MilestoneTab';
import PlanTab from './PlanTab';
import ProjectInfoTab from './ProjectInfoTab';
import RequirementTab from './RequirementTab';

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'git+ssh:', 'ssh:'];

const TABS = [
  { key: 'info', label: '项目信息' },
  { key: 'announcement', label: '项目公告' },
  { key: 'milestone', label: '项目进度' },
  { key: 'plan', label: '项目计划' },
  { key: 'requirement', label: '需求管理' },
  { key: 'issue', label: '问题管理' },
  { key: 'cost', label: '成本管理' },
  { key: 'document', label: '文档管理' },
];

function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const canManage = canManageProjects(currentUser);
  const { members } = useMembers();
  const projectId = Number(id);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '加载项目详情失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--error-light)',
            color: 'var(--error)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!project) return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'info':
        return <ProjectInfoTab project={project} members={members} canManage={canManage} onUpdate={fetchProject} />;
      case 'announcement':
        return <AnnouncementTab project={project} canManage={canManage} onUpdate={fetchProject} />;
      case 'milestone':
        return <MilestoneTab projectId={projectId} canManage={canManage} />;
      case 'plan':
        return <PlanTab projectId={projectId} members={members} canManage={canManage} />;
      case 'requirement':
        return <RequirementTab projectId={projectId} members={members} canManage={canManage} />;
      case 'issue':
        return <IssueTab projectId={projectId} members={members} canManage={canManage} />;
      case 'cost':
        return <CostTab projectId={projectId} members={members} canManage={canManage} />;
      case 'document':
        return <DocumentTab projectId={projectId} canManage={canManage} />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate('/projects')} title="返回">
              <ArrowLeft size={18} />
            </button>
            <h1 className="page-title" style={{ margin: 0 }}>{project.name}</h1>
            <span className={`status-badge status-${getStatusClass(project.status)}`}>
              {project.status}
            </span>
            {project.git_url && isSafeUrl(project.git_url) ? (
              <a
                href={project.git_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <GitBranch size={14} />
                Git 仓库
                <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
          <p className="page-description" style={{ marginLeft: 48 }}>
            {project.description || '暂无项目描述'}
            {project.project_manager && ` · 负责人：${project.project_manager}`}
            {project.client_name && ` · 客户：${project.client_name}`}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-1)',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className="btn btn-ghost"
            style={{
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: -1,
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}
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

export default ProjectDetail;
