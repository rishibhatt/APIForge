"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/hooks/useLanguage";
import { useSwaggerParser } from "@/hooks/useSwaggerParser";
import { useWorkspaceStore } from "@/store/workspaceStore";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import WorkspaceSidebar from "@/components/atomic/organisms/WorkspaceSidebar/WorkspaceSidebar";
import HeroSection from "@/components/sections/HeroSection/HeroSection";
import LandingMarketing from "@/components/sections/LandingMarketing/LandingMarketing";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import shell from "./WorkspaceShell.module.css";

// Workspace-only UI loads on demand so the landing page ships less JavaScript.
const WorkspaceCodePanel = dynamic(
  () => import("@/components/atomic/organisms/WorkspaceCodePanel/WorkspaceCodePanel"),
);
const WorkspaceFooter = dynamic(
  () => import("@/components/atomic/organisms/WorkspaceFooter/WorkspaceFooter"),
);
const WorkspaceHeader = dynamic(
  () => import("@/components/atomic/organisms/WorkspaceHeader/WorkspaceHeader"),
);
const MobileBottomNav = dynamic(
  () => import("@/components/atomic/organisms/MobileBottomNav/MobileBottomNav"),
);
const QualityScoreModal = dynamic(
  () => import("@/components/atomic/organisms/WorkspaceQualityScore/QualityScoreModal"),
);

export default function WorkspaceShell() {
  const { t } = useLanguage();
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);
  const { parseUrl, isLoading, error } = useSwaggerParser();

  const workspaceVisible = endpoints.length > 0;
  const focusMode = useWorkspaceStore((s) => s.focusMode);

  const onForge = useCallback(() => {
    void parseUrl(specUrlInput);
  }, [parseUrl, specUrlInput]);

  const onSelectSampleUrl = useCallback(
    (url: string) => {
      setSpecUrlInput(url);
      void parseUrl(url);
    },
    [parseUrl, setSpecUrlInput]
  );

  const mainClass = useMemo(
    () =>
      [
        shell.main,
        workspaceVisible ? shell.withWorkspaceMobile : shell.mainLanding,
        workspaceVisible && focusMode ? shell.mainFocus : "",
      ]
        .filter(Boolean)
        .join(" "),
    [workspaceVisible, focusMode],
  );

  return (
    <div
      className={`${shell.shell} ${workspaceVisible ? shell.workspaceShell : ""} ${focusMode && workspaceVisible ? shell.focusMode : ""}`}
    >
      {workspaceVisible ? (
        <WorkspaceHeader
          t={t}
          hasWorkspace={workspaceVisible}
          isParsing={isLoading}
          parseError={error}
          onParse={onForge}
        />
      ) : (
        <LandingHeader t={t} />
      )}
      <WorkspaceSidebar t={t} hasWorkspace={workspaceVisible} />
      <main className={mainClass}>
        {!workspaceVisible ? (
          <>
            <HeroSection
              t={t}
              isLoading={isLoading}
              error={error}
              onForge={onForge}
              onSelectSampleUrl={onSelectSampleUrl}
            />
            <LandingMarketing
              t={t}
              isLoading={isLoading}
              error={error}
              onForge={onForge}
            />
            <LandingFooter t={t} />
          </>
        ) : (
          <div className={shell.workspaceMain}>
            <div className={`${shell.workspaceChrome} ${shell.workspaceChromeNoCollection}`}>
              <div className={shell.workspaceEngine}>
                <WorkspaceCodePanel t={t} />
              </div>
            </div>
          </div>
        )}
      </main>
      {workspaceVisible ? <QualityScoreModal t={t} /> : null}
      {workspaceVisible && !focusMode ? (
        <MobileBottomNav t={t} hasWorkspace={workspaceVisible} />
      ) : null}
      {workspaceVisible ? <WorkspaceFooter t={t} hasWorkspace /> : null}
    </div>
  );
}
