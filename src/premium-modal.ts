import { App, Modal, Setting } from 'obsidian';
import type ArcadiaPublisherPlugin from './main';
import { validateLicense } from './license';

export class PremiumModal extends Modal {
	private plugin: ArcadiaPublisherPlugin;
	private featureName: string;
	private textInputEl: HTMLInputElement | null = null;

	constructor(app: App, plugin: ArcadiaPublisherPlugin, featureName: string) {
		super(app);
		this.plugin = plugin;
		this.featureName = featureName;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Premium features' });
		contentEl.createEl('p', {
			text: `"${this.featureName}" is part of Arcadia Publisher premium.`,
		});
		contentEl.createEl('p', {
			text: 'Purchase a license to unlock all premium features, or enter your existing license key below.',
			cls: 'setting-item-description',
		});

		new Setting(contentEl)
			.setName('License key')
			.setDesc('Enter your license key')
			.addText(text => {
				this.textInputEl = text.inputEl;
				text
					.setPlaceholder('Xxxx-xxxx-xxxx-xxxx')
					.onChange(async (value) => {
						if (value.trim().length > 10) {
							const status = await validateLicense(value.trim());
							if (status.valid) {
								this.plugin.settings.licenseKey = value.trim();
								this.plugin.settings.licenseStatus = status;
								this.plugin.settings.isPro = true;
								await this.plugin.saveSettings();
								this.close();
							}
						}
					});
			});

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Get premium')
				.setCta()
				.onClick(() => {
					window.open('https://arcadia-studio.lemonsqueezy.com', '_blank');
				})
			)
			.addButton(btn => btn
				.setButtonText('I have a license key')
				.onClick(() => {
					if (this.textInputEl) {
						this.textInputEl.focus();
					}
				})
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}
