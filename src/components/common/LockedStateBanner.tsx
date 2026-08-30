import React from 'react';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { TabKey } from '../../types/index.ts';

interface LockedStateBannerProps {
  title: string;
  description: string;
  targetTab: TabKey;
  actionText: string;
  onNavigate: (tab: TabKey) => void;
  prerequisites?: { text: string; done: boolean }[];
}

export const LockedStateBanner: React.FC<LockedStateBannerProps> = ({
  title,
  description,
  targetTab,
  actionText,
  onNavigate,
  prerequisites = []
}) => {
  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
      <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto">{description}</p>

      {prerequisites.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-left max-w-md mx-auto space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Requisitos previos para desbloquear:
          </p>
          {prerequisites.map((p, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-xs">
              {p.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className={p.done ? 'text-slate-700 line-through' : 'text-slate-900 font-medium'}>
                {p.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onNavigate(targetTab)}
        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
      >
        <span>{actionText}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
