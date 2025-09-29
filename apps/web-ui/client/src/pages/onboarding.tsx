import { ServiceOnboardingWizard } from "@/components/onboarding/ServiceOnboardingWizard";
import { AppShell } from "@/components/AppShell";
import { useLocation } from "wouter";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();

  const handleComplete = () => {
    // Navigate to operations page after successful service creation
    setLocation("/operations");
  };

  const handleCancel = () => {
    // Navigate back to dashboard
    setLocation("/");
  };

  return (
    <AppShell 
      breadcrumbs={[
        { label: 'Shinobi ADP' }, 
        { label: 'Service Creation' },
        { label: 'Onboarding Wizard' }
      ]}
      showTimelineRail={false}
      showMetadataRail={false}
    >
      <div className="max-w-6xl mx-auto">
        <ServiceOnboardingWizard 
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </AppShell>
  );
}