import React, { useState, useEffect, useRef } from 'react';
import { Send, Database, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { Card, SectionHeader } from '../shared/Card';
import { API_BASE_URL } from '../../config';

export const ChatTab = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [availableTables, setAvailableTables] = useState({});
  const [selectedTables, setSelectedTables] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load suggestions and available tables
    const loadInitialData = async () => {
      try {
        const [suggestionsRes, tablesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/chat/suggestions`),
          fetch(`${API_BASE_URL}/chat/tables`)
        ]);
        
        const suggestionsData = await suggestionsRes.json();
        const tablesData = await tablesRes.json();
        
        setSuggestions(suggestionsData.suggestions || []);
        setAvailableTables(tablesData.tables || {});
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
    
    // Add welcome message
    setMessages([{
      type: 'bot',
      text: 'สวัสดีค่ะ! ฉันเป็น AI ที่จะช่วยคุณค้นหาข้อมูลจากฐานข้อมูลสัมภาษณ์ คุณสามารถถามคำถามเกี่ยวกับข้อมูลได้เลยค่ะ',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          selected_tables: selectedTables.length > 0 ? selectedTables : null
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const botMessage = {
        type: 'bot',
        text: data.response,
        sql_query: data.sql_query,
        data: data.data,
        report: data.report,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        text: 'ขอโทษค่ะ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleTableSelection = (tableName) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader 
          title="💬 Chat with AI - ถามข้อมูลจากฐานข้อมูล" 
          subtitle="ใช้ภาษาธรรมชาติในการค้นหาข้อมูลจากฐานข้อมูลสัมภาษณ์" 
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Table Selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Database size={16} />
                เลือกตาราง (ไม่บังคับ)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.keys(availableTables).map(tableName => (
                  <label key={tableName} className="flex items-start gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(tableName)}
                      onChange={() => toggleTableSelection(tableName)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">{tableName}</div>
                      <div className="text-xs text-slate-500">{availableTables[tableName]?.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                ตัวอย่างคำถาม
              </h3>
              <div className="space-y-2">
                {suggestions.slice(0, 5).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3 flex flex-col h-[600px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-lg p-4 mb-4 space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {message.type === 'bot' && <MessageSquare size={16} className="text-blue-500 mt-1" />}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        
                        {/* Show AI Report if available */}
                        {message.report && (
                          <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                              <Sparkles size={16} />
                              <span>AI Analysis Report</span>
                            </div>
                            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {message.report}
                            </div>
                          </div>
                        )}
                        
                        {/* Show SQL Query if available */}
                        {message.sql_query && (
                          <div className="mt-3 p-3 bg-slate-100 rounded text-xs font-mono overflow-x-auto">
                            <div className="text-slate-600 mb-1">SQL Query:</div>
                            <code className="text-slate-800">{message.sql_query}</code>
                          </div>
                        )}
                        
                        {/* Show Data Table if available */}
                        {message.data && message.data.length > 0 && (
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-xs border border-slate-200">
                              <thead className="bg-slate-100">
                                <tr>
                                  {Object.keys(message.data[0]).map(key => (
                                    <th key={key} className="border border-slate-200 px-2 py-1 text-left">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {message.data.slice(0, 10).map((row, rowIdx) => (
                                  <tr key={rowIdx} className="hover:bg-slate-50">
                                    {Object.values(row).map((value, colIdx) => (
                                      <td key={colIdx} className="border border-slate-200 px-2 py-1">
                                        {String(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {message.data.length > 10 && (
                              <div className="text-xs text-slate-500 mt-2">
                                ... และอีก {message.data.length - 10} รายการ
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs opacity-70 text-right">
                      {message.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="พิมพ์คำถามของคุณที่นี่..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !inputMessage.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send size={18} />
                ส่ง
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
