import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import authApi from "../api/authApi";
import { clearClientSession } from "../utils/authSession";
import {
  Bell,
  BookOpen,
  ChevronRight,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Search,
  Wallet,
  Trophy,
  TrendingUp,
  Target,
  ClipboardList,
  ClipboardCheck,
  Menu,
  X,
  CheckCircle2
} from "lucide-react";

import { TEACHER_API_BASE_URL } from "../api/apiConfig";
import TeacherAttendancePanel from "../components/teachers/TeacherAttendancePanel";

const TeacherDashboard = () => {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [teacher] = useState(
    JSON.parse(localStorage.getItem("teacher") || "{}")
  );

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mini, setMini] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `${TEACHER_API_BASE_URL}/api/teacher/profile`,
        { withCredentials: true }
      );

      setProfileData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.teacherLogout();
    } catch (_error) {
      // Clear client session even if the network request fails.
    }
    clearClientSession();
    navigate("/portal");
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "performance", label: "Performance", icon: Target },
    { id: "salary", label: "Salary & Bank", icon: Wallet }
  ];

  return (

    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar */}

      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300
        ${mini ? "w-16" : "w-60"}
        ${mobileOpen ? "block" : "hidden md:block"}`}
      >

        <div className="p-5 flex items-center gap-3 border-b">

          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            T
          </div>

          {!mini && (
            <span className="font-bold text-gray-800">
              Teacher Portal
            </span>
          )}

        </div>

        <div className="p-4 space-y-1">

          {tabs.map((tab) => (

            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm
              ${
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >

              <tab.icon size={18} />

              {!mini && tab.label}

            </button>

          ))}

        </div>

        <div className="absolute bottom-5 w-full px-4">

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 text-sm"
          >
            <LogOut size={18} />
            {!mini && "Log Out"}
          </button>

        </div>

      </aside>

      {/* Main */}

      <div className="flex-1 flex flex-col">

        {/* Topbar */}

        <header className="bg-white border-b px-6 py-3 flex justify-between items-center">

          <button
            onClick={() => {
              if (window.innerWidth < 768) setMobileOpen(!mobileOpen);
              else setMini(!mini);
            }}
          >
            {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>

          <h1 className="font-semibold text-gray-800">
            Teacher Dashboard
          </h1>

          <div className="flex items-center gap-4">

            <div className="hidden md:flex items-center bg-gray-100 px-3 py-1 rounded-lg">
              <Search size={16} className="text-gray-500"/>
              <input
                className="bg-transparent outline-none ml-2 text-sm"
                placeholder="Search"
              />
            </div>

            <Bell size={20} className="text-gray-600"/>

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                T
              </div>

              <div className="hidden md:flex flex-col text-xs">
                <span>{teacher.name}</span>
                <span className="text-gray-500">
                  {teacher.regNo}
                </span>
              </div>

            </div>

          </div>

        </header>

        {/* Content */}

        <main className="p-6">

          {/* Overview */}

          {activeTab === "overview" && (

            <div className="space-y-6">

              <div className="flex justify-between items-center">

                <div>
                  <h2 className="text-2xl font-bold">
                    Hi, {teacher.name} 👋
                  </h2>
                  <p className="text-gray-500">
                    Welcome to your dashboard
                  </p>
                </div>

                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded">
                  ID: {teacher.regNo}
                </span>

              </div>

              {/* Cards */}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Assignments */}

                <div className="bg-white border rounded-xl shadow-sm">

                  <div className="p-4 border-b flex justify-between items-center">

                    <div className="flex items-center gap-2 font-semibold">
                      <BookOpen size={18} className="text-green-500"/>
                      My Assignments
                    </div>

                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded">
                      {profileData?.teacher?.assignments?.length || 0}
                    </span>

                  </div>

                  <div className="p-4">

                    {profileData?.teacher?.assignments?.length ? (

                      profileData.teacher.assignments.map((asgn,i)=>(
                        <div key={i} className="flex justify-between py-2 border-b text-sm">

                          <span>
                            {asgn.batchId?.name || asgn.batchName}
                          </span>

                          <ChevronRight size={16}/>

                        </div>
                      ))

                    ) : (
                      <p className="text-sm text-gray-500">
                        No batches assigned
                      </p>
                    )}

                  </div>

                </div>

                {/* Salary Card */}

                <div className="bg-white border rounded-xl shadow-sm">

                  <div className="p-4 border-b font-semibold flex gap-2 items-center">
                    <Wallet size={18} className="text-green-500"/>
                    Payout Profile
                  </div>

                  <div className="p-6 text-center">

                    <IndianRupee
                      size={32}
                      className="mx-auto text-green-500 mb-3"
                    />

                    <h3 className="text-xl font-bold">
                      ₹ {profileData?.teacher?.salary || 0}
                    </h3>

                    <p className="text-gray-500 text-sm">
                      Gross Salary
                    </p>

                    <div className="mt-4 text-sm bg-gray-50 p-2 rounded flex justify-between">

                      <span className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className="text-green-500"
                        />
                        Bank Linked
                      </span>

                      <span className="text-green-600 font-semibold">
                        {profileData?.bankDetails?.bankName
                          ? "Active"
                          : "Missing"}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          )}

          {/* Attendance */}

          {activeTab === "attendance" && (
            <TeacherAttendancePanel/>
          )}

        </main>

      </div>

    </div>

  );
};

export default TeacherDashboard;
