import Image from "next/image";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import SearchField from "@/components/atomic/molecules/SearchField/SearchField";
import { PROFILE_IMAGE_URL } from "@/constants/assets";
import styles from "./WorkspaceHeader.module.css";

interface WorkspaceHeaderProps {
  t: TranslateFn;
}

export default function WorkspaceHeader({ t }: WorkspaceHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.brand}>{t("common.appName")}</span>
        <nav className={styles.nav} aria-label={t("nav.aria")}>
          <a className={styles.navLinkActive} href="#">
            {t("nav.workspace")}
          </a>
          {/* <a className={styles.navLink} href="#">
            {t("nav.history")}
          </a>
          <a className={styles.navLink} href="#">
            {t("nav.deployments")}
          </a> */}
        </nav>
      </div>
      {/* <div className={styles.right}>
        <div className={styles.searchWrap}>
          <SearchField
            id="header-search"
            label={t("header.searchPlaceholder")}
            placeholder={t("header.searchPlaceholder")}
          />
        </div>
        <button
          type="button"
          className={`${styles.iconBtn} focusRing`}
          aria-label={t("a11y.notifications")}
        >
          <MaterialIcon name="notifications" />
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} focusRing`}
          aria-label={t("a11y.settings")}
        >
          <MaterialIcon name="settings" />
        </button>
        <div className={styles.avatar}>
          <Image
            src={PROFILE_IMAGE_URL}
            alt={t("a11y.userProfile")}
            width={32}
            height={32}
            priority
          />
        </div>
      </div> */}
    </header>
  );
}
