export const ROLE_LABELS = {
  admin: '管理员',
  manager: '项目经理',
  member: '普通成员',
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export const hasRole = (user, roles) => roles.includes(user?.role);

export const isAdmin = (user) => hasRole(user, ['admin']);

export const canManagePlatform = (user) => hasRole(user, ['admin']);

export const canManageProjects = (user) => hasRole(user, ['admin', 'manager']);
