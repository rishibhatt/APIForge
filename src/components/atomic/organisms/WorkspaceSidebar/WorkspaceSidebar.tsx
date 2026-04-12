import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./WorkspaceSidebar.module.css";

interface WorkspaceSidebarProps {
  t: TranslateFn;
}

export default function WorkspaceSidebar({ t }: WorkspaceSidebarProps) {
  return (
    <aside className={styles.aside} aria-label={t("sidebar.apiExplorer")}>
      <div className={styles.head}>
        <div className={styles.iconWrap}>
          <MaterialIcon name="api" />
        </div>
        <div>
          <h3 className={styles.title}>{t("sidebar.apiExplorer")}</h3>
          {/* <p className={styles.version}>{t("sidebar.version")}</p> */}
        </div>
      </div>
      <nav className={styles.nav}>
        <p className={styles.collectionsLabel}>{t("sidebar.collections")}</p>
        <div className={styles.collectionList}>
          <button type="button" className={styles.colBtnActive}>
            <MaterialIcon name="lock" size="sm" />
            <span>{t("sidebar.auth")}</span>
          </button>
          {/* <button type="button" className={styles.colBtn}>
            <MaterialIcon name="person" size="sm" />
            <span>{t("sidebar.users")}</span>
          </button>
          <button type="button" className={styles.colBtn}>
            <MaterialIcon name="payments" size="sm" />
            <span>{t("sidebar.payments")}</span>
          </button> */}
        </div>
        <div className={styles.footerNav}>
          <button type="button" className={styles.footerBtn}>
            <MaterialIcon name="menu_book" size="sm" />
            <span>{t("sidebar.documentation")}</span>
          </button>
          <button type="button" className={styles.footerBtn}>
            <MaterialIcon name="help" size="sm" />
            <span>{t("sidebar.support")}</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
