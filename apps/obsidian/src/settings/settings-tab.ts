import {
  type App,
  Notice,
  type Plugin,
  PluginSettingTab,
  SecretComponent,
  Setting,
} from "obsidian";
import { describeError, type KaneoService } from "../kaneo/kaneo-service";
import type { KaneoSettings } from "./settings";

type SettingsHost = {
  settings: KaneoSettings;
  saveSettings(): Promise<void>;
};

export class KaneoSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private host: Plugin & SettingsHost,
    private service: KaneoService,
  ) {
    super(app, host);
  }

  private async saveChange(change: Partial<KaneoSettings>) {
    Object.assign(this.host.settings, change);
    await this.host.saveSettings();
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Kaneo address")
      .setDesc("The address you open Kaneo at. Task links open here.")
      .addText((text) =>
        text
          .setPlaceholder("https://cloud.kaneo.app")
          .setValue(this.host.settings.webUrl)
          .onChange((webUrl) => this.saveChange({ webUrl })),
      );

    new Setting(containerEl)
      .setName("API address")
      .setDesc(
        "Only when the Kaneo API runs on a different host. Leave empty to use the Kaneo address.",
      )
      .addText((text) =>
        text
          .setPlaceholder("Same as the Kaneo address")
          .setValue(this.host.settings.apiUrl)
          .onChange((apiUrl) => this.saveChange({ apiUrl })),
      );

    new Setting(containerEl)
      .setName("API key")
      .setDesc(
        "Create a key in Kaneo under Account settings → Developer. Obsidian keeps it in its secret storage, not in the vault.",
      )
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.host.settings.apiKeySecret)
          .onChange((apiKeySecret) =>
            this.saveChange({ apiKeySecret: apiKeySecret ?? "" }),
          ),
      );

    new Setting(containerEl)
      .setName("Refresh interval")
      .setDesc(
        "Seconds between refreshes of visible task blocks. 0 turns it off. A block's own autorefresh wins.",
      )
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text
          .setValue(String(this.host.settings.autorefreshSeconds))
          .onChange((value) => {
            const seconds = Number(value);
            if (Number.isFinite(seconds) && seconds >= 0) {
              void this.saveChange({ autorefreshSeconds: seconds });
            }
          });
      });

    new Setting(containerEl)
      .setName("Check connection")
      .setDesc("Loads your workspaces with the address and key above.")
      .addButton((button) =>
        button.setButtonText("Check").onClick(async () => {
          button.setDisabled(true);
          try {
            this.service.refresh({ meta: true });
            const meta = await this.service.meta();
            new Notice(
              `Connected to Kaneo: ${meta.workspaces.length} workspaces, ${meta.projects.length} projects.`,
            );
          } catch (error) {
            new Notice(describeError(error));
          } finally {
            button.setDisabled(false);
          }
        }),
      );
  }
}
