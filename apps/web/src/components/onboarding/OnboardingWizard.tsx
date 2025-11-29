import React, { useState } from 'react';

interface OnboardingWizardProps {
  currentData: any;
  onComplete: (icp: any) => Promise<void>;
}

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Energy',
];

const GEOGRAPHIES = [
  'North America',
  'Europe',
  'Asia Pacific',
  'LATAM',
  'Middle East',
];

const DEAL_SIZES = ['<$1M', '$1M-$5M', '$5M-$10M', '$10M+'];

const PERSONAS = [
  'CEO',
  'VP Sales',
  'CFO',
  'VP Marketing',
  'CTO',
  'VP Operations',
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  currentData,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [icp, setIcp] = useState(currentData.orgICP);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelection = (category: string, value: string) => {
    const categoryArray = icp[category as keyof typeof icp] || [];
    const newArray = categoryArray.includes(value)
      ? categoryArray.filter((item) => item !== value)
      : [...categoryArray, value];

    setIcp({
      ...icp,
      [category]: newArray,
    });
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(icp);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      title: 'Industries',
      category: 'industries',
      options: INDUSTRIES,
    },
    {
      title: 'Geographies',
      category: 'geographies',
      options: GEOGRAPHIES,
    },
    {
      title: 'Deal Sizes',
      category: 'dealSizes',
      options: DEAL_SIZES,
    },
    {
      title: 'Personas',
      category: 'personas',
      options: PERSONAS,
    },
  ];

  const step = steps[currentStep];

  return (
    <div className="onboarding-wizard">
      <div className="wizard-progress">
        <div className="progress-bar">
          <div
            className="progress"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
        <span className="progress-text">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className="wizard-content">
        <h2>{step.title}</h2>
        <p>Select one or more {step.title.toLowerCase()} for your organization</p>

        <div className="options">
          {step.options.map((option) => (
            <label key={option} className="option">
              <input
                type="checkbox"
                checked={icp[step.category as keyof typeof icp]?.includes(option) || false}
                onChange={() =>
                  handleSelection(step.category, option)
                }
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="wizard-actions">
        <button
          className="btn btn-secondary"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          Previous
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={handleComplete}
            disabled={isLoading}
          >
            {isLoading ? 'Completing...' : 'Complete Setup'}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};
