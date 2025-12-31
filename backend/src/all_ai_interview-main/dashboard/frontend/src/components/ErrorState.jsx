import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ErrorState = ({ error }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <div className="text-red-600 mb-4">
          <AlertTriangle size={48} className="mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Error Loading Data</h2>
        <p className="text-slate-600 text-center mb-4">{error}</p>
        <p className="text-sm text-slate-500 text-center">
          Make sure the API server is running at <code className="bg-slate-100 px-2 py-1 rounded">http://localhost:8000</code>
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
};
