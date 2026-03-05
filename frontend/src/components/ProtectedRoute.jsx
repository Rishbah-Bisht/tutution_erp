import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const location = useLocation();

    if (!token) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        // Redirect to their respective dashboards if they have the wrong role
        if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
        if (role === 'student') return <Navigate to="/student-dashboard" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
