import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasClientSession } from '../utils/authSession';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const role = localStorage.getItem('role');
    const location = useLocation();

    if (!hasClientSession()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to="/login" replace />;
    }

    if (role === 'student' && allowedRoles.includes('student')) {
        let student = {};
        try {
            student = JSON.parse(localStorage.getItem('student') || '{}');
        } catch {
            student = {};
        }
        const needsSetup = student.needsSetup !== undefined
            ? student.needsSetup
            : ((student.portalAccess?.signupStatus || 'no') !== 'yes' || !student.profileImage);

        if (needsSetup && location.pathname !== '/student-setup') {
            return <Navigate to="/student-setup" replace />;
        }
        if (!needsSetup && location.pathname === '/student-setup') {
            return <Navigate to="/student-dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
