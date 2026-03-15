import React from 'react';
import { CareAdvice } from '../types';
import WaterIcon from './icons/WaterIcon';
import SunIcon from './icons/SunIcon';
import SoilIcon from './icons/SoilIcon';
import InfoIcon from './icons/InfoIcon';

const getIcon = (title: string): React.FC<{ className?: string }> => {
    const lowerCaseTitle = title.toLowerCase();
    if (lowerCaseTitle.includes('water')) return WaterIcon;
    if (lowerCaseTitle.includes('sun') || lowerCaseTitle.includes('light')) return SunIcon;
    if (lowerCaseTitle.includes('soil') || lowerCaseTitle.includes('pot') || lowerCaseTitle.includes('fertiliz')) return SoilIcon;
    return InfoIcon;
};

const ActionPlan: React.FC<{ advice: CareAdvice[] }> = ({ advice }) => {
    if (!advice.length) {
        return (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-primary">No action plan yet</p>
                <p className="mt-2 text-sm text-slate-200">
                    This result did not include detailed care steps. Use the learning panel and snapshot comparison above, then ask the AI chat for a more specific next-step plan.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {advice.map((item, index) => {
                const Icon = getIcon(item.title);
                return (
                    <div key={index} className="flex items-start rounded-r-2xl border-l-4 border-primary bg-white/5 p-3">
                        <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/25 text-xs font-bold text-primary">
                           {index + 1}
                        </div>
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center mr-4">
                           <Icon className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-100">{item.title}</p>
                            <p className="text-sm text-slate-300">{item.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActionPlan;
