import type { Metadata } from "next";
import { PageContainer } from "@/components/page/blocks";
import { ProjectsView } from "./ProjectsView";

export const metadata: Metadata = {
  title: "My projects",
  description: "Your saved GableMath calculations and combined shopping lists — stored only in this browser.",
  robots: { index: false, follow: true },
};

export default function ProjectsPage() {
  return (
    <PageContainer className="pt-10">
      <h1 className="display text-[2.3rem] leading-[1.1] text-ink sm:text-[2.8rem]">My projects</h1>
      <p className="mt-3 max-w-2xl text-[1.04rem] leading-relaxed text-ink-2">
        Save calculations from any calculator to a project. Each project adds everything up into one shopping list. Saved only in
        this browser — no account needed.
      </p>
      <div className="mt-8">
        <ProjectsView />
      </div>
    </PageContainer>
  );
}
