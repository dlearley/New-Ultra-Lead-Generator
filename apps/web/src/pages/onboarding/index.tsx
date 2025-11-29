import React, { useState, useEffect } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { onboardingStore } from '@/stores/onboardingStore';
import '@/styles/onboarding.css';

export default function OnboardingPage() {
  const { onboardingData, fetchOnboarding, completeOnboarding } = onboardingStore();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const handleComplete = async (icp: any) => {
    await completeOnboarding(icp);
  };

  if (!onboardingData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <h1>Organization Setup</h1>
        {onboardingData.isCompleted && (
          <span className="badge badge-success">Completed</span>
        )}
      </header>

      <div className="onboarding-container">
        <OnboardingWizard
          currentData={onboardingData}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
