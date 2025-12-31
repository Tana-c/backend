import React from 'react';

const InsightsTable = ({ data }) => {
    return (
        <div className="card overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">ตารางวิเคราะห์เชิงลึก</h2>
                    <p className="text-sm text-gray-500">กรอบการลงรหัสและคำพูดสำคัญ</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
                    พบ {data.length} รหัส (Codes)
                </div>
            </div>
            <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">รหัส (Code ID)</th>
                            <th className="px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">ธีมหลัก</th>
                            <th className="px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">ความหมาย</th>
                            <th className="px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider max-w-xs">คำพูดจากผู้ใช้ (Verbatim)</th>
                            <th className="px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">อินไซต์ (Insight)</th>
                            <th className="px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">คำถามเจาะลึกถัดไป</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row) => (
                            <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-4 align-top">
                                    <span className="font-mono text-sm font-bold text-indigo-600">{row.id}</span>
                                    <div className="text-xs text-gray-500 font-medium mt-1">{row.code}</div>
                                </td>
                                <td className="px-6 py-4 align-top">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                        {row.theme}
                                    </span>
                                </td>
                                <td className="px-6 py-4 align-top text-sm text-gray-700 font-medium">{row.meaning}</td>
                                <td className="px-6 py-4 align-top text-sm text-gray-600 italic bg-gray-50/50 border-l-2 border-indigo-200 pl-4 py-2 my-2 rounded-r-lg max-w-xs">
                                    "{row.verbatim}"
                                </td>
                                <td className="px-6 py-4 align-top text-sm font-semibold text-gray-800">{row.insight}</td>
                                <td className="px-6 py-4 align-top">
                                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <span className="block font-bold text-slate-400 mb-1 text-[10px] uppercase">ถามต่อ:</span>
                                        {row.nextQuestion}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InsightsTable;
