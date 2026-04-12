"use client";

import { useCallback, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSwaggerParser } from "@/hooks/useSwaggerParser";
import { useWorkspaceStore } from "@/store/workspaceStore";
import WorkspaceCodePanel from "@/components/atomic/organisms/WorkspaceCodePanel/WorkspaceCodePanel";
import WorkspaceFooter from "@/components/atomic/organisms/WorkspaceFooter/WorkspaceFooter";
import WorkspaceHeader from "@/components/atomic/organisms/WorkspaceHeader/WorkspaceHeader";
import WorkspaceSidebar from "@/components/atomic/organisms/WorkspaceSidebar/WorkspaceSidebar";
import MobileBottomNav from "@/components/atomic/organisms/MobileBottomNav/MobileBottomNav";
import EndpointStrip from "@/components/atomic/organisms/EndpointStrip/EndpointStrip";
import HeroSection from "@/components/sections/HeroSection/HeroSection";
import shell from "./WorkspaceShell.module.css";

export default function WorkspaceShell() {
  const { t } = useLanguage();
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const { parseUrl, isLoading, error } = useSwaggerParser();

  const hasWorkspace = endpoints.length > 0;

  const onForge = useCallback(() => {
    void parseUrl(specUrlInput);
  }, [parseUrl, specUrlInput]);

  const mainClass = useMemo(
    () =>
      [
        shell.main,
        hasWorkspace ? shell.withWorkspaceMobile : shell.mainLanding,
      ]
        .filter(Boolean)
        .join(" "),
    [hasWorkspace],
  );

  return (
    <div className={shell.shell}>
      <WorkspaceHeader
        t={t}
        hasWorkspace={hasWorkspace}
        isLoading={isLoading}
        onForge={onForge}
      />
      <WorkspaceSidebar t={t} hasWorkspace={hasWorkspace} />
      <main className={mainClass}>
        {!hasWorkspace ? (
          <HeroSection
            t={t}
            isLoading={isLoading}
            error={error}
            onForge={onForge}
          />
        ) : (
          <div className={shell.workspaceMain}>
            <div className={shell.workspaceBody}>
              {activeEndpoint ? (
                <EndpointStrip t={t} endpoint={activeEndpoint} />
              ) : null}
              <WorkspaceCodePanel t={t} />
            </div>
          </div>
        )}
      </main>
      {hasWorkspace ? <MobileBottomNav t={t} hasWorkspace={hasWorkspace} /> : null}
      {hasWorkspace ? <WorkspaceFooter t={t} hasWorkspace /> : null}
    </div>
  );
}
