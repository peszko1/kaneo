import { Plugin } from "obsidian";
import { KaneoService } from "./kaneo/kaneo-service";
import { KaneoQueryBlock } from "./render/query-block";
import { DEFAULT_SETTINGS, type KaneoSettings } from "./settings/settings";
import { KaneoSettingTab } from "./settings/settings-tab";

export default class KaneoPlugin extends Plugin {
  settings: KaneoSettings = { ...DEFAULT_SETTINGS };
  private service = new KaneoService(this.app, () => this.settings);

  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.addSettingTab(new KaneoSettingTab(this.app, this, this.service));

    this.registerMarkdownCodeBlockProcessor("kaneo", (source, el, ctx) => {
      const filename = ctx.sourcePath.split("/").pop()?.replace(/\.md$/, "");
      ctx.addChild(
        new KaneoQueryBlock(
          el,
          source,
          filename ?? "",
          this.service,
          () => this.settings,
        ),
      );
    });

    this.addCommand({
      id: "refresh",
      name: "Refresh task blocks",
      callback: () => this.service.refresh({ meta: true }),
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.service.refresh({ meta: true });
  }
}
