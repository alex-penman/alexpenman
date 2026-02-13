import SetupWizard from "@/app/components/SetupWizard";

export const metadata = {
  title: "Setup Avatar & Voice · Alex Penman",
  description: "Create your personalized 3D avatar and voice clone"
};

export default function SetupPage() {
  return (
    <main className="setup-page">
      <SetupWizard />
    </main>
  );
}
