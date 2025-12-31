import React, { useState } from 'react';
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    Clock,
    Activity,
    TrendingUp
} from 'lucide-react';
import StatsCard from './StatsCard';
import CodeFrequencyChart from './Charts/CodeFrequencyChart';
import ThemeDistributionChart from './Charts/ThemeDistributionChart';
import InsightsTable from './InsightsTable';
import { interviewStats, codingTableData, themeDistribution, codeFrequency } from '../data/mockData';

const Dashboard = () => {
    // Basic sidebar navigation state (mock since it's a single page)
    const [activeTab, setActiveTab] = useState('insights');

    return (
        <div className="dashboard-grid">
            {/* Sidebar with Glass Effect */}
            <aside className="border-r border-[rgba(255,255,255,0.5)] flex flex-col backdrop-blur-md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)' }}>
                <div className="p-6 mb-2">
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 mb-1"
                        style={{ backgroundImage: 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
                        AI Interviewer
                    </h1>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wilder">แดชบอร์ดวิเคราะห์ผล</p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem
                        icon={LayoutDashboard}
                        label="ภาพรวม"
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    />
                    <NavItem
                        icon={Activity}
                        label="ข้อมูลเชิงลึก (Coding)"
                        active={activeTab === 'insights'}
                        onClick={() => setActiveTab('insights')}
                    />
                    <NavItem
                        icon={Users}
                        label="ผู้ให้สัมภาษณ์"
                        active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                    />
                    <NavItem
                        icon={MessageSquare}
                        label="บทสัมภาษณ์"
                        active={activeTab === 'transcripts'}
                        onClick={() => setActiveTab('transcripts')}
                    />
                </nav>

                <div className="p-4 border-t border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.3)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-violet-100 border border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold">
                            JD
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">John Doe</div>
                            <div className="text-xs text-gray-500">หัวหน้าทีมวิจัย</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider border border-indigo-100">โปรเจกต์วิเคราะห์</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">กรณีศึกษา: น้ำยาล้างจาน</h1>
                        <p className="text-gray-500 mt-1">เจาะลึกข้อมูลจากการสัมภาษณ์เชิงลึก (In-Depth Interviews)</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary">
                            ส่งออกรายงาน
                        </button>
                        <button className="btn-primary">
                            + สัมภาษณ์ใหม่
                        </button>
                    </div>
                </header>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard
                        title="ผู้เข้าร่วมทั้งหมด"
                        value={interviewStats.totalUsers}
                        subtext="+2 ในสัปดาห์นี้"
                        icon={Users}
                    />
                    <StatsCard
                        title="จำนวนเซสชัน"
                        value={interviewStats.totalSessions}
                        icon={MessageSquare}
                    />
                    <StatsCard
                        title="ระยะเวลาเฉลี่ย"
                        value={interviewStats.totalDuration}
                        subtext="ต่อการสัมภาษณ์"
                        icon={Clock}
                    />
                    <StatsCard
                        title="ความรู้สึกหลัก"
                        value="Pain Points"
                        subtext="ขับเคลื่อนโดยเรื่องสุขภาพผิว"
                        icon={TrendingUp}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <CodeFrequencyChart data={codeFrequency} />
                    <ThemeDistributionChart data={themeDistribution} />
                </div>

                {/* Insights Table */}
                <div className="mb-8">
                    <h2 className="mb-4 text-xl">ข้อมูลเชิงลึกและคำพูดสำคัญ</h2>
                    <InsightsTable data={codingTableData} />
                </div>

            </main>
        </div>
    );
};

// Simple helper component for Nav Items
const NavItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`nav-item ${active ? 'active' : ''}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={active ? 2.5 : 2} />
        {label}
    </button>
);

export default Dashboard;
