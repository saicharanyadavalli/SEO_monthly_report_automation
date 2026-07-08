"use client";

import { useWizardStore } from "@/store/useWizardStore";
import { StepProgress } from "@/components/wizard/StepProgress";
import { Step1Configure } from "@/components/wizard/Step1Configure";
import { Step2SelectSlides } from "@/components/wizard/Step2SelectSlides";
import { Step3Reorder } from "@/components/wizard/Step3Reorder";
import { Step4Generate } from "@/components/wizard/Step4Generate";
import { Step5Complete } from "@/components/wizard/Step5Complete";
import { ClientConfig } from "@/lib/config/clientRepository";

interface WizardProps {
  clients: ClientConfig[];
}

export function GenerateWizard({ clients }: WizardProps) {
  const { currentStep } = useWizardStore();

  return (
    <div className="flex flex-col space-y-8 max-w-6xl mx-auto py-4">
      {currentStep < 5 && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-8">Generate Report</h1>
          <div className="px-4">
            <StepProgress currentStep={currentStep} />
          </div>
        </div>
      )}

      <div className={currentStep < 5 ? "mt-8" : "mt-2"}>
        {currentStep === 1 && <Step1Configure clients={clients} />}
        {currentStep === 2 && <Step2SelectSlides />}
        {currentStep === 3 && <Step3Reorder />}
        {currentStep === 4 && <Step4Generate clients={clients} />}
        {currentStep === 5 && <Step5Complete clients={clients} />}
      </div>
    </div>
  );
}
