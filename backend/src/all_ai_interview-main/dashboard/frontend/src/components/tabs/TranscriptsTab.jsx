import React, { useState } from 'react';
import { Users, MessageSquare } from 'lucide-react';

export const TranscriptsTab = ({ transcriptsData, insightsData }) => {
  const [selectedInterviewId, setSelectedInterviewId] = useState('P1');

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
      {/* Sidebar List */}
      <div className="w-full lg:w-1/4 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={18}/> ผู้ให้สัมภาษณ์</h3>
        </div>
        <div className="overflow-y-auto flex-1">
          {Object.keys(transcriptsData).map((id) => {
            const person = insightsData.find(p => p.id === id);
            return (
              <button
                key={id}
                onClick={() => setSelectedInterviewId(id)}
                className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                  selectedInterviewId === id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${selectedInterviewId === id ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                    {id}
                  </span>
                  <span className="font-medium text-slate-700 text-sm">{person?.role || 'User'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat View */}
      <div className="w-full lg:w-3/4 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-500"/> 
              บทสัมภาษณ์: {selectedInterviewId}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {insightsData.find(p => p.id === selectedInterviewId)?.role}
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {transcriptsData[selectedInterviewId]?.map((line, index) => (
            <div key={index} className={`flex ${line.speaker === 'Interviewer' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                line.speaker === 'Interviewer' 
                  ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none' 
                  : 'bg-blue-600 text-white rounded-tr-none'
              }`}>
                <p className="text-xs font-bold mb-1 opacity-70">{line.speaker}</p>
                <p className="text-sm leading-relaxed">{line.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
