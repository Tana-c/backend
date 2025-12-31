import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Users, MessageCircle, Star, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { Card, StatCard, SectionHeader } from '../shared/Card';

export const OverviewTab = ({ brandData }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Interviews" value="25" subtext="Diverse backgrounds" color="text-indigo-600" />
        <StatCard icon={MessageCircle} title="Top Theme" value="Packaging" subtext="57 Mentions" color="text-pink-600" />
        <StatCard icon={Star} title="Top Brand" value="Sunlight" subtext="Most currently used" color="text-yellow-500" />
        <StatCard icon={AlertTriangle} title="Key Pain Point" value="Residue" subtext="Chemical safety concerns" color="text-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionHeader title="Brand Usage Distribution" subtitle="Based on currently used brands mentioned" />
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Demographics Summary" subtitle="Key Segments" />
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full"><Users size={16} className="text-blue-600"/></div>
              <div><p className="font-semibold text-sm">Housewives & Moms</p><p className="text-xs text-slate-500">Focus on Safety & Gentle</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full"><DollarSign size={16} className="text-green-600"/></div>
              <div><p className="font-semibold text-sm">Business Owners</p><p className="text-xs text-slate-500">Focus on Cost & Efficiency</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full"><Package size={16} className="text-purple-600"/></div>
              <div><p className="font-semibold text-sm">Students/Dorm</p><p className="text-xs text-slate-500">Focus on Space & Price</p></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
