import React, { useState, useEffect } from 'react';
import { Shield, Package, Droplets, Sparkles, TrendingUp, AlertTriangle, Target, Loader2, FileText } from 'lucide-react';
import { Card, SectionHeader } from '../shared/Card';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { API_BASE_URL } from '../../config';

export const FindingsTab = ({ executiveSummary, setExecutiveSummary }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch if we don't have data yet
    if (executiveSummary) {
      return;
    }

    const fetchExecutiveSummary = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/insights/executive-summary`);
        if (!response.ok) throw new Error('Failed to fetch executive summary');
        const data = await response.json();
        setExecutiveSummary(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching executive summary:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchExecutiveSummary();
  }, [executiveSummary, setExecutiveSummary]);

  return (
    <div className="space-y-6">
      {/* Executive Summary Panel */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-indigo-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg">
            <FileText size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              บทสรุปผู้บริหาร
              <Sparkles size={20} className="text-indigo-500" />
            </h2>
            <p className="text-sm text-slate-600">Executive Summary - AI-Powered Insights</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
            <span className="ml-3 text-slate-600">กำลังสร้างรายงานด้วย AI...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
            <p className="text-red-700">ไม่สามารถโหลดบทสรุปผู้บริหารได้</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        ) : executiveSummary?.success ? (
          <div>
            {/* Data Context Pills */}
            {executiveSummary.data_context && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-4 py-2 bg-white/80 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                  📊 {executiveSummary.data_context.total_interviews} สัมภาษณ์
                </span>
                <span className="px-4 py-2 bg-white/80 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                  👥 อายุเฉลี่ย {executiveSummary.data_context.avg_age} ปี
                </span>
                <span className="px-4 py-2 bg-white/80 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                  ✨ AI-Generated Report
                </span>
              </div>
            )}

            {/* AI-Generated Summary */}
            <div className="bg-white/90 backdrop-blur rounded-xl p-8 shadow-lg border border-indigo-100">
              <div className="max-w-none">
                <MarkdownRenderer content={executiveSummary.summary} />
              </div>
            </div>

            {/* Quick Stats */}
            {executiveSummary.data_context && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                    <TrendingUp size={18} />
                    <span>Top Positive Themes</span>
                  </div>
                  <ul className="text-sm text-green-800 space-y-1">
                    {executiveSummary.data_context.top_positive_themes.map((theme, idx) => (
                      <li key={idx}>• {theme}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-700 font-semibold mb-2">
                    <AlertTriangle size={18} />
                    <span>Top Concerns</span>
                  </div>
                  <ul className="text-sm text-orange-800 space-y-1">
                    {executiveSummary.data_context.top_concerns.map((theme, idx) => (
                      <li key={idx}>• {theme}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                    <Target size={18} />
                    <span>Top Brands</span>
                  </div>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {executiveSummary.data_context.top_brands.map((brand, idx) => (
                      <li key={idx}>• {brand}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto text-yellow-600 mb-2" size={32} />
            <p className="text-yellow-800">OpenAI API ยังไม่ได้ตั้งค่า</p>
            <p className="text-sm text-yellow-700 mt-1">กรุณาตั้งค่า OPENAI_API_KEY ใน .env file</p>
          </div>
        )}
      </Card>

      {/* Key Findings Cards - AI Generated */}
      {executiveSummary?.key_findings && executiveSummary.key_findings.length > 0 && (
        <div>
          <SectionHeader title="ข้อค้นพบสำคัญจากข้อมูล" subtitle="Key Findings from Interview Analysis" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {executiveSummary.key_findings.map((finding, index) => {
              const colors = [
                { border: 'border-t-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-600', icon: Shield },
                { border: 'border-t-pink-500', bg: 'bg-pink-100', text: 'text-pink-600', icon: Package },
                { border: 'border-t-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-600', icon: Droplets }
              ];
              const color = colors[index] || colors[0];
              const Icon = color.icon;

              return (
                <Card key={index} className={`h-full border-t-4 ${color.border}`}>
                  <div className={`mb-4 ${color.bg} w-12 h-12 rounded-full flex items-center justify-center ${color.text}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{finding.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {finding.description}
                    {finding.opportunity && (
                      <>
                        <br/><br/>
                        <strong>โอกาส (Opportunity):</strong> {finding.opportunity}
                      </>
                    )}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
