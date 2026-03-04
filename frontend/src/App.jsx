import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminProfilePage from './pages/AdminProfilePage';
import StudentsPage from './pages/StudentsPage';
import FeesPage from './pages/FeesPage';
import BatchesPage from './pages/BatchesPage';
import TeachersPage from './pages/TeachersPage';
import ExpensesPage from './pages/ExpensesPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherPayrollDashboard from './pages/TeacherPayrollDashboard';
import { API_BASE_URL } from './api/apiConfig';
import AnalyticsPage from './pages/AnalyticsPage';
import BatchDetailsPage from './pages/BatchDetailsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import NotificationHistoryPage from './pages/NotificationHistoryPage';
import SettingsPage from './pages/SettingsPage';
import ExamsPage from './pages/ExamsPage';

function App() {
    useEffect(() => {
        // Set default values in case network fails - Match index.css charcoal theme
        document.documentElement.style.setProperty('--erp-primary', '#0f172a');
        document.documentElement.style.setProperty('--erp-secondary', '#2563eb');

        // Fetch baseline institute settings (Publicly accessible)
        axios.get(`${API_BASE_URL}/api/settings`)
            .then(res => {
                const settings = res.data;
                localStorage.setItem('instituteSettings', JSON.stringify(settings));

                // Set universal CSS variables immediately
                if (settings.themeColors && settings.themeColors.length >= 2) {
                    document.documentElement.style.setProperty('--erp-primary', settings.themeColors[0]);
                    document.documentElement.style.setProperty('--erp-secondary', settings.themeColors[1]);
                }
            })
            .catch(err => console.error("Failed to load institute config:", err));
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Admin Routes */}
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/profile" element={<AdminProfilePage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentProfilePage />} />
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/batches" element={<BatchesPage />} />
                <Route path="/batches/:id" element={<BatchDetailsPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/payroll" element={<TeacherPayrollDashboard />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/notifications" element={<NotificationHistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/exams" element={<ExamsPage />} />

                {/* Teacher Routes */}
                <Route path="/teacher-dashboard" element={<TeacherDashboard />} />

                {/* Student Routes */}
                <Route path="/student-dashboard" element={<StudentDashboard />} />

                {/* Fallback */}
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
