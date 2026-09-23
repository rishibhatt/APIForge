"use client";

import { useCallback, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSwaggerParser } from "@/hooks/useSwaggerParser";
import { useWorkspaceStore } from "@/store/workspaceStore";
/**
 * Collection sidepane: `EndpointListColumn` is temporarily commented out so the
 * workspace engine can use the full chrome width. Re-enable by restoring the
 * import and `{!focusMode ? <EndpointListColumn t={t} /> : null}` in `workspaceChrome`.
 */
// import EndpointListColumn from "@/components/atomic/organisms/EndpointListColumn/EndpointListColumn";
import WorkspaceCodePanel from "@/components/atomic/organisms/WorkspaceCodePanel/WorkspaceCodePanel";
import WorkspaceFooter from "@/components/atomic/organisms/WorkspaceFooter/WorkspaceFooter";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import WorkspaceHeader from "@/components/atomic/organisms/WorkspaceHeader/WorkspaceHeader";
import WorkspaceSidebar from "@/components/atomic/organisms/WorkspaceSidebar/WorkspaceSidebar";
import MobileBottomNav from "@/components/atomic/organisms/MobileBottomNav/MobileBottomNav";
import HeroSection from "@/components/sections/HeroSection/HeroSection";
import LandingMarketing from "@/components/sections/LandingMarketing/LandingMarketing";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import QualityScoreModal from "@/components/atomic/organisms/WorkspaceQualityScore/QualityScoreModal";
import FloatingSupportButton from "@/components/atomic/atoms/FloatingSupportButton/FloatingSupportButton";
import SupportModal from "@/components/atomic/organisms/SupportModal/SupportModal";
import shell from "./WorkspaceShell.module.css";

export default function WorkspaceShell() {
  const { t } = useLanguage();
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const { parseUrl, isLoading, error } = useSwaggerParser();

  const workspaceVisible = endpoints.length > 0;
  const focusMode = useWorkspaceStore((s) => s.focusMode);

  const onForge = useCallback(() => {
    void parseUrl(specUrlInput);
  }, [parseUrl, specUrlInput]);

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
      className={`${shell.shell} ${focusMode && workspaceVisible ? shell.focusMode : ""}`}
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
      {!workspaceVisible ? <FloatingSupportButton t={t} /> : null}
      <SupportModal t={t} />
      {workspaceVisible && !focusMode ? (
        <MobileBottomNav t={t} hasWorkspace={workspaceVisible} />
      ) : null}
      {workspaceVisible ? <WorkspaceFooter t={t} hasWorkspace /> : null}
    </div>
  );
}
