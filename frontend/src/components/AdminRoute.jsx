import { Navigate } from 'react-router-dom';
import { getStoredUser, isAdmin } from '../utils/auth';

const AdminRoute = ({ children }) => {
  const user = getStoredUser();

  if (!isAdmin(user)) {
    return <Navigate to="/projects" replace />;
  }

  return children;
};

export default AdminRoute;
