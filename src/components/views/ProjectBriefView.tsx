import React, { useState } from 'react';
import { FileText, CheckCircle2, Edit3, Lock, Unlock, ArrowRight, Save } from 'lucide-react';
import { DigitalProductProject, ProjectIntake } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ProjectBriefViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateIntake: (intake: ProjectIntake) => void;
  lang?: Language;
}

export const ProjectBriefView: React.FC<ProjectBriefViewProps> = ({
  project,
  setActiveView,
  onUpdateIntake,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [intake, setIntake] = useState<ProjectIntake>(project.intake);
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});

  const handleToggleLock = (fieldKey: string) => {
    setLockedFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };

  const handleAcceptAll = () => {
    onUpdateIntake(intake);
    setActiveView('uvz');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{t.navProjectBrief}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.briefTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.briefSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.approveBriefCta}</span>
          </button>
        </div>
      </div>

      {/* 13 Fields Grid */}
      <div className="space-y-4">
        {/* Part 1: Creator Background & Core Identity (Fields 1 – 6) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            {t.part1Title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Project Name */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-slate-800">1. {lang === 'en' ? 'Project Name' : '專案名稱'}</span>
                <button onClick={() => handleToggleLock('projectName')} className="text-slate-400 hover:text-slate-600">
                  {lockedFields['projectName'] ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>
              <input
                type="text"
                disabled={lockedFields['projectName']}
                value={intake.projectName}
                onChange={(e) => setIntake({ ...intake, projectName: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 2: Creator Name */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-slate-800">2. {lang === 'en' ? 'Creator / Brand Name' : '創作者/品牌名稱'}</span>
                <button onClick={() => handleToggleLock('creatorName')} className="text-slate-400 hover:text-slate-600">
                  {lockedFields['creatorName'] ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>
              <input
                type="text"
                disabled={lockedFields['creatorName']}
                value={intake.creatorName}
                onChange={(e) => setIntake({ ...intake, creatorName: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 3: Experience Level */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">3. {lang === 'en' ? 'Experience Level' : '經驗等級'}</span>
              <select
                value={intake.experienceLevel}
                onChange={(e) => setIntake({ ...intake, experienceLevel: e.target.value as any })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
                <option value="EXPERT">EXPERT</option>
              </select>
            </div>

            {/* Field 4: Relevant Experience */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">4. {lang === 'en' ? 'Relevant Experience' : '相關實務經驗'}</span>
              <input
                type="text"
                value={intake.relevantExperience}
                onChange={(e) => setIntake({ ...intake, relevantExperience: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 5: Expertise */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">5. {lang === 'en' ? 'Subject Matter Expertise' : '核心專業範疇'}</span>
              <input
                type="text"
                value={intake.expertise}
                onChange={(e) => setIntake({ ...intake, expertise: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 6: Interests */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">6. {lang === 'en' ? 'Creator Focus & Interests' : '創作者研究興趣'}</span>
              <input
                type="text"
                value={intake.interests}
                onChange={(e) => setIntake({ ...intake, interests: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Part 2: Audience & Transformation Strategy (Fields 7 – 10) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            {t.part2Title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 7: Target Audience */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">7. {lang === 'en' ? 'Target Audience Definition' : '目標受眾設定'}</span>
              <textarea
                rows={2}
                value={intake.targetAudience}
                onChange={(e) => setIntake({ ...intake, targetAudience: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 8: Problems Solved */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">8. {lang === 'en' ? 'Core Problems Solved' : '解決之痛點難題'}</span>
              <textarea
                rows={2}
                value={intake.problemsSolved}
                onChange={(e) => setIntake({ ...intake, problemsSolved: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 9: Product Idea */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">9. {lang === 'en' ? 'Product Concept & Hook' : '產品概念與訴求'}</span>
              <textarea
                rows={2}
                value={intake.productIdea}
                onChange={(e) => setIntake({ ...intake, productIdea: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Field 10: Desired Transformation */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 text-xs block mb-1">10. {lang === 'en' ? 'Desired Transformation Promise' : '核心承諾與轉變'}</span>
              <textarea
                rows={2}
                value={intake.desiredTransformation}
                onChange={(e) => setIntake({ ...intake, desiredTransformation: e.target.value })}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Part 3: Style, Boundaries & Pricing Ladder (Fields 11 – 13) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            {t.part3Title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Field 11: Brand Style and Voice */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">11. {lang === 'en' ? 'Brand Voice & Style' : '品牌語調與視覺方向'}</span>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div><strong>Personality:</strong> {intake.brandStyleAndVoice.personality}</div>
                <div><strong>Voice:</strong> {intake.brandStyleAndVoice.writingVoice}</div>
                <div><strong>Typography:</strong> {intake.brandStyleAndVoice.typographyDirection}</div>
              </div>
            </div>

            {/* Field 12: Constraints and Exclusions */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">12. {lang === 'en' ? 'Constraints & Disclaimers' : '邊界限制與免責規範'}</span>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div><strong>Boundaries:</strong> {intake.constraintsAndExclusions.productBoundaries}</div>
                <div><strong>Accuracy:</strong> {intake.constraintsAndExclusions.accuracyStandards}</div>
                <div><strong>Safety:</strong> {intake.constraintsAndExclusions.safetyRules}</div>
              </div>
            </div>

            {/* Field 13: Recommended Price Ladder */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-xs block">13. {lang === 'en' ? 'Pricing Ladder' : '建議定價階梯'}</span>
              <div className="text-xs font-mono font-bold text-indigo-600 py-1">
                ${intake.recommendedPrice.introductoryTest} / ${intake.recommendedPrice.regular} / ${intake.recommendedPrice.premiumBundle} {intake.recommendedPrice.currency}
              </div>
              <p className="text-[11px] text-slate-500">{intake.recommendedPrice.rationale}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
