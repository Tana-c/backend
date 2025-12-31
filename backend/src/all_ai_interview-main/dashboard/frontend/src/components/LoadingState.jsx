import React from 'react';

export const LoadingState = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 text-lg">Loading dashboard data...</p>
        <p className="text-slate-400 text-sm mt-2">Fetching data from API</p>
      </div>
    </div>
  );
};
