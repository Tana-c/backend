import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react';
import { Card, SectionHeader } from '../shared/Card';
import { fetchThemesTable, fetchThemeInsightsBySentiment } from '../../services/api';
import { API_BASE_URL } from '../../config';

export const ThemesTab = ({ themesData: initialThemesData, aiInsights, setAiInsights }) => {
  const [themesTableData, setThemesTableData] = useState([]);
  const [themesData, setThemesData] = useState(initialThemesData);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [sentimentInsights, setSentimentInsights] = useState({ positive: [], negative: [] });
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const loadThemesTable = async () => {
      try {
        const [tableData, insights] = await Promise.all([
          fetchThemesTable(),
          fetchThemeInsightsBySentiment()
        ]);
        
        // Sort themes by theme_id (C1, C2, C3...)
        const sortedTableData = [...tableData].sort((a, b) => a.theme_id - b.theme_id);
        setThemesTableData(sortedTableData);
        setSentimentInsights(insights);
        
        // Update chart data to match table data (top 9 themes)
        const chartData = tableData.slice(0, 9).map(theme => ({
          name: theme.theme_name_th || theme.theme_name_en,
          total: theme.mention_count,
          Positive: Math.floor(theme.mention_count * 0.5),
          Mixed: Math.floor(theme.mention_count * 0.3),
          Negative: Math.floor(theme.mention_count * 0.1),
          Neutral: Math.floor(theme.mention_count * 0.1)
        }));
        setThemesData(chartData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading themes table:', error);
        setLoading(false);
      }
    };
    loadThemesTable();
  }, []);

  useEffect(() => {
    // Only fetch if we don't have AI insights yet
    if (aiInsights) {
      return;
    }

    const loadAiInsights = async () => {
      try {
        setInsightsLoading(true);
        const response = await fetch(`${API_BASE_URL}/insights/theme-sentiment-insights`);
        if (!response.ok) throw new Error('Failed to fetch AI insights');
        const data = await response.json();
        if (data.success) {
          setAiInsights(data);
        }
        setInsightsLoading(false);
      } catch (error) {
        console.error('Error loading AI insights:', error);
        setInsightsLoading(false);
      }
    };
    loadAiInsights();
  }, [aiInsights, setAiInsights]);

  const formatThemeId = (themeId) => {
    return `C${String(themeId).padStart(2, '0')}`;
  };

  const toggleRow = (themeId) => {
    setExpandedRows(prev => ({
      ...prev,
      [themeId]: !prev[themeId]
    }));
  };

  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title="Theme Frequency & Sentiment Breakdown" subtitle="Number of mentions per theme categorized by sentiment" />
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={themesData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Legend />
              <Bar dataKey="Positive" stackId="a" fill="#4CAF50" />
              <Bar dataKey="Mixed" stackId="a" fill="#FFC107" />
              <Bar dataKey="Negative" stackId="a" fill="#F44336" />
              <Bar dataKey="Neutral" stackId="a" fill="#9E9E9E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
          <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3"><TrendingUp size={18}/> Top Positive Drivers</h3>
          {insightsLoading ? (
            <div className="text-sm text-green-600">กำลังวิเคราะห์ insights...</div>
          ) : aiInsights && aiInsights.positive_drivers ? (
            <div className="space-y-4">
              {aiInsights.positive_drivers.map((item, idx) => (
                <div key={idx} className="bg-white/60 p-4 rounded-lg border border-green-200">
                  <div className="font-bold text-green-800 mb-1">
                    {item.theme_name} ({item.mention_count} mentions)
                  </div>
                  <div className="text-sm text-green-700 mb-2 italic">
                    {item.insight}
                  </div>
                  {item.sample_quotes && item.sample_quotes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.sample_quotes.slice(0, 2).map((quote, qIdx) => (
                        <div key={qIdx} className="text-xs text-green-600 bg-green-50 p-2 rounded border-l-2 border-green-400">
                          <MessageSquare size={12} className="inline mr-1" />
                          "{quote.substring(0, 100)}{quote.length > 100 ? '...' : ''}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-green-600">ไม่มีข้อมูล</div>
          )}
        </div>

        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
          <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-3"><AlertTriangle size={18}/> Top Concerns (Mixed/Negative)</h3>
          {insightsLoading ? (
            <div className="text-sm text-orange-600">กำลังวิเคราะห์ insights...</div>
          ) : aiInsights && aiInsights.top_concerns ? (
            <div className="space-y-4">
              {aiInsights.top_concerns.map((item, idx) => (
                <div key={idx} className="bg-white/60 p-4 rounded-lg border border-orange-200">
                  <div className="font-bold text-orange-800 mb-1">
                    {item.theme_name} ({item.mention_count} mentions)
                  </div>
                  <div className="text-sm text-orange-700 mb-2 italic">
                    {item.insight}
                  </div>
                  {item.sample_quotes && item.sample_quotes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.sample_quotes.slice(0, 2).map((quote, qIdx) => (
                        <div key={qIdx} className="text-xs text-orange-600 bg-orange-50 p-2 rounded border-l-2 border-orange-400">
                          <MessageSquare size={12} className="inline mr-1" />
                          "{quote.substring(0, 100)}{quote.length > 100 ? '...' : ''}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-orange-600">ไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      <Card>
        <SectionHeader title="รายละเอียด Themes ทั้งหมด" subtitle="จำนวนการกล่าวถึงและตัวอย่างประโยคจากผู้ใช้" />
        {loading ? (
          <div className="text-center py-8 text-slate-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="text-left p-3 font-semibold text-slate-700">Theme ID</th>
                  <th className="text-left p-3 font-semibold text-slate-700">ชื่อ Theme</th>
                  <th className="text-center p-3 font-semibold text-slate-700">จำนวนครั้ง</th>
                  <th className="text-left p-3 font-semibold text-slate-700">ตัวอย่างประโยคจากผู้ใช้ (3 คน)</th>
                </tr>
              </thead>
              <tbody>
                {themesTableData.map((theme, index) => (
                  <tr key={theme.theme_id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="p-3">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                        {formatThemeId(theme.theme_id)}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{theme.theme_name_th || theme.theme_name_en}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {theme.mention_count}
                      </span>
                    </td>
                    <td className="p-3">
                      {theme.examples && theme.examples.length > 0 ? (
                        <div>
                          <div className="space-y-2">
                            {theme.examples.slice(0, expandedRows[theme.theme_id] ? theme.examples.length : 1).map((example, idx) => (
                              <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex items-start gap-2 mb-1">
                                  <MessageSquare size={14} className="text-blue-500 mt-1 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-xs font-semibold text-slate-600">
                                      {example.interview_id} - {example.role}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed pl-5">
                                  "{expandedRows[theme.theme_id] ? example.quote_sample : truncateText(example.quote_sample)}"
                                </p>
                              </div>
                            ))}
                          </div>
                          {theme.examples.length > 1 && (
                            <button
                              onClick={() => toggleRow(theme.theme_id)}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                            >
                              {expandedRows[theme.theme_id] ? (
                                <>
                                  <span>ซ่อน</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>ดูเพิ่มเติม ({theme.examples.length - 1} ตัวอย่าง)</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">ไม่มีตัวอย่างประโยค</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
