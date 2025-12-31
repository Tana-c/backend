import React, { useState, useEffect } from 'react';
import { transformDataForDashboard, fetchInterviewDetail } from './services/api';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { OverviewTab } from './components/tabs/OverviewTab';
import { ThemesTab } from './components/tabs/ThemesTab';
import { InsightsTab } from './components/tabs/InsightsTab';
import { TranscriptsTab } from './components/tabs/TranscriptsTab';
import { FindingsTab } from './components/tabs/FindingsTab';
import { ChatTab } from './components/tabs/ChatTab';

const App = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterviewId, setSelectedInterviewId] = useState('P1');
  
  // API data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themesData, setThemesData] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [insightsData, setInsightsData] = useState([]);
  const [transcriptsData, setTranscriptsData] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [themeAiInsights, setThemeAiInsights] = useState(null);

  // Load data from API on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await transformDataForDashboard();
        
        setThemesData(data.themesData);
        setBrandData(data.brandData);
        setInsightsData(data.insightsData);
        setAnalytics(data.analytics);
        
        // Load transcripts for all interviews
        const transcripts = {};
        for (const interview of data.interviews) {
          const detail = await fetchInterviewDetail(interview.interview_id);
          transcripts[interview.interview_id] = detail.transcript;
        }
        setTranscriptsData(transcripts);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const filteredInsights = insightsData.filter(item => 
    item.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.want?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.but?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
      
      {/* Header */}
      <header className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Analysis Dashboard</h1>
            <p className="text-slate-500">
              Based on {analytics?.total_interviews || 25} In-depth Interviews (P1 - P{analytics?.total_interviews || 25})
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            {['overview', 'themes', 'insights', 'transcripts', 'findings', 'chat'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'transcripts' ? 'บทสัมภาษณ์' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        
        {activeTab === 'overview' && <OverviewTab brandData={brandData} />}

        {activeTab === 'themes' && (
          <ThemesTab 
            themesData={themesData}
            aiInsights={themeAiInsights}
            setAiInsights={setThemeAiInsights}
          />
        )}

        {activeTab === 'insights' && <InsightsTab insightsData={insightsData} />}

        {activeTab === 'transcripts' && <TranscriptsTab transcriptsData={transcriptsData} insightsData={insightsData} />}

        {activeTab === 'findings' && (
          <FindingsTab 
            executiveSummary={executiveSummary}
            setExecutiveSummary={setExecutiveSummary}
          />
        )}

        {activeTab === 'chat' && <ChatTab />}

      </main>
    </div>
  );
};

export default App;
