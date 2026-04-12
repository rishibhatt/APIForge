"use client";

import { useLanguage } from "@/hooks/useLanguage";
import EndpointsExplorerPanel from "@/components/atomic/organisms/EndpointsExplorerPanel/EndpointsExplorerPanel";
import WorkspaceCodePanel from "@/components/atomic/organisms/WorkspaceCodePanel/WorkspaceCodePanel";
import WorkspaceFooter from "@/components/atomic/organisms/WorkspaceFooter/WorkspaceFooter";
import WorkspaceHeader from "@/components/atomic/organisms/WorkspaceHeader/WorkspaceHeader";
import WorkspaceSidebar from "@/components/atomic/organisms/WorkspaceSidebar/WorkspaceSidebar";
import HeroSection from "@/components/sections/HeroSection/HeroSection";
import shell from "./WorkspaceShell.module.css";

export default function WorkspaceShell() {
  const { t } = useLanguage();

  return (
    <>
      <WorkspaceHeader t={t} />
      <WorkspaceSidebar t={t} />
      <main className={shell.main}>
        <HeroSection t={t} />
        <section className={shell.grid}>
          <div className={shell.colEndpoints}>
            <EndpointsExplorerPanel t={t} />
          </div>
          <div className={shell.colCode}>
            <WorkspaceCodePanel t={t} />
          </div>
        </section>
      </main>
      <WorkspaceFooter t={t} />
    </>
  );
}
