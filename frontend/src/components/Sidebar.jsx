import { Kanban, LogOut, Shield, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import LogoIcon from './LogoIcon';
import { APP_NAME, APP_VERSION } from '../constants/app';
import {
  canManagePlatform,
  getStoredUser,
  ROLE_LABELS,
} from '../utils/auth';

const Sidebar = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user.display_name || user.username || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const navItems = [
    { path: '/projects', label: '项目管理', icon: Kanban },
    { path: '/members', label: '成员库', icon: Users },
  ];

  if (canManagePlatform(user)) {
    navItems.push({ path: '/users', label: '用户管理', icon: Shield });
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">
          <LogoIcon size={18} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="sidebar-brand">{APP_NAME}</span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'rgba(203, 213, 225, 0.72)',
              letterSpacing: '0.04em',
            }}
          >
            v{APP_VERSION}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="主导航">
        <div className="sidebar-section-label">Workspace</div>
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-item-icon">
              <Icon size={18} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-avatar">{initials}</span>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">
              {ROLE_LABELS[user.role] || '未分配角色'}
            </div>
          </div>
          <button
            className="btn-icon btn-ghost"
            onClick={handleLogout}
            title="退出登录"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
