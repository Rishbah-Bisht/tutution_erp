import React from 'react';

export const SkeletonLine = ({ width = '100%', height = '12px', className = '' }) => (
    <div
        className={`shimmer rounded ${className}`}
        style={{ width, height }}
    />
);

export const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
            <SkeletonLine width="60%" height="20px" className="rounded-md" />
            <SkeletonLine width="24px" height="24px" className="rounded-full" />
        </div>
        <div className="space-y-2">
            <SkeletonLine width="40%" height="10px" />
            <SkeletonLine width="80%" height="10px" />
        </div>
        <div className="pt-4 flex justify-between items-center border-t border-slate-50">
            <SkeletonLine width="30%" height="14px" />
            <SkeletonLine width="20%" height="12px" />
        </div>
    </div>
);

export const SkeletonStat = () => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
        <SkeletonLine width="40%" height="10px" className="uppercase opacity-50" />
        <SkeletonLine width="60%" height="32px" className="mt-1" />
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="w-full bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 p-4 border-bottom border-slate-100 flex gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonLine key={i} width="15%" height="12px" />)}
        </div>
        <div className="p-4 space-y-6">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                    <SkeletonLine width="32px" height="32px" className="rounded-full flex-shrink-0" />
                    <SkeletonLine width="25%" height="12px" />
                    <SkeletonLine width="20%" height="12px" />
                    <SkeletonLine width="15%" height="12px" />
                    <SkeletonLine width="10%" height="12px" className="ml-auto" />
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonSidebarItem = () => (
    <div className="space-y-2">
        <SkeletonLine width="30%" height="10px" className="opacity-50" />
        <SkeletonLine width="70%" height="16px" />
    </div>
);
