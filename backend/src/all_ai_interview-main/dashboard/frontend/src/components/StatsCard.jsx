import React from 'react';

const StatsCard = ({ title, value, subtext, icon: Icon }) => {
    return (
        <div className="card flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
                </div>
                {Icon && (
                    <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-500">
                        <Icon size={20} strokeWidth={2} />
                    </div>
                )}
            </div>
            {subtext && <div className="text-xs text-gray-400 font-medium">{subtext}</div>}
        </div>
    );
};

export default StatsCard;
