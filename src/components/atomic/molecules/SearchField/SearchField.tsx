import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  id: string;
  label: string;
  placeholder: string;
}

export default function SearchField({ id, label, placeholder }: SearchFieldProps) {
  return (
    <div className={styles.wrap}>
      <MaterialIcon name="search" className={styles.icon} scale75 />
      <label htmlFor={id} className="srOnly">
        {label}
      </label>
      <input
        id={id}
        type="search"
        name="search"
        placeholder={placeholder}
        className={`${styles.input} focusRing`}
        autoComplete="off"
      />
    </div>
  );
}
