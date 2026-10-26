import i18n from "i18next";

// Thrown before any optimistic update when a change is made offline that
// cannot be queued (see `saveTaskEdit` for the ones that can).
export class OfflineError extends Error {
  constructor() {
    super(i18n.t("common:offline.changesDisabled"));
    this.name = "OfflineError";
  }
}
