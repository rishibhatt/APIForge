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
import shell from "./WorkspaceShell.module.css";

export default function WorkspaceShell() {
  const { t } = useLanguage();
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const { parseUrl, parseFile, isLoading, error } = useSwaggerParser();

  const hasWorkspace = endpoints.length > 0;
  const focusMode = useWorkspaceStore((s) => s.focusMode);

  const onForge = useCallback(() => {
    void parseUrl(specUrlInput);
  }, [parseUrl, specUrlInput]);

  const mainClass = useMemo(
    () =>
      [
        shell.main,
        hasWorkspace ? shell.withWorkspaceMobile : shell.mainLanding,
        hasWorkspace && focusMode ? shell.mainFocus : "",
      ]
        .filter(Boolean)
        .join(" "),
    [hasWorkspace, focusMode],
  );

  return (
    <div
      className={`${shell.shell} ${focusMode && hasWorkspace ? shell.focusMode : ""}`}
    >
      {hasWorkspace ? (
        <WorkspaceHeader
          t={t}
          hasWorkspace={hasWorkspace}
          isParsing={isLoading}
          parseError={error}
          onParse={onForge}
        />
      ) : (
        <LandingHeader t={t} />
      )}
      <WorkspaceSidebar t={t} hasWorkspace={hasWorkspace} />
      <main className={mainClass}>
        {!hasWorkspace ? (
          <>
            <HeroSection
              t={t}
              isLoading={isLoading}
              error={error}
              onForge={onForge}
              onParseFile={(file) => void parseFile(file)}
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
      {hasWorkspace && !focusMode ? (
        <MobileBottomNav t={t} hasWorkspace={hasWorkspace} />
      ) : null}
      {hasWorkspace ? <WorkspaceFooter t={t} hasWorkspace /> : null}
    </div>
  );
}
