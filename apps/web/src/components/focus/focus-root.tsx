import { FocusView } from "./focus-view";
import { useFocusTabSync } from "./use-focus-tab-sync";

export function FocusRoot() {
  useFocusTabSync();
  return <FocusView />;
}
