import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface EmptyArraySettings {
    accessToken: string;
    inboxFilePath: string;
    objectsFilePath: string;
    dailyNoteFormat: string;
}

const DEFAULT_SETTINGS: EmptyArraySettings = {
    accessToken: '',
    inboxFilePath: 'inbox.md',
    objectsFilePath: 'objects.md',
    dailyNoteFormat: 'YYYY-MM-DD'
};

export default class EmptyArraySync extends Plugin {
    settings: EmptyArraySettings;

    async onload() {
        await this.loadSettings();

        // Add commands to the command palette
        this.addCommand({
            id: 'sync-daily-notes',
            name: 'Sync Daily Notes',
            callback: () => this.syncDailyNotes()
        });

        this.addCommand({
            id: 'sync-inbox',
            name: 'Sync Inbox',
            callback: () => this.syncInbox()
        });

        this.addCommand({
            id: 'sync-objects',
            name: 'Sync Objects',
            callback: () => this.syncObjects()
        });

        // Add settings tab
        this.addSettingTab(new EmptyArraySettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async syncDailyNotes() {
        try {
            const response = await fetch('https://api.emptyarray.co/v1/scheduled-items', {
                headers: {
                    'Authorization': `Bearer ${this.settings.accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch scheduled items');
            }

            const items = await response.json();
            const dailyNotePath = `${moment().format(this.settings.dailyNoteFormat)}.md`;
            const content = this.formatScheduledItems(items);
            
            await this.app.vault.adapter.write(dailyNotePath, content);
        } catch (error) {
            console.error('Error syncing daily notes:', error);
        }
    }

    async syncInbox() {
        try {
            const response = await fetch('https://api.emptyarray.co/v1/inbox', {
                headers: {
                    'Authorization': `Bearer ${this.settings.accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch inbox items');
            }

            const items = await response.json();
            const content = this.formatInboxItems(items);
            
            await this.app.vault.adapter.write(this.settings.inboxFilePath, content);
        } catch (error) {
            console.error('Error syncing inbox:', error);
        }
    }

    async syncObjects() {
        try {
            const response = await fetch('https://api.emptyarray.co/v1/objects', {
                headers: {
                    'Authorization': `Bearer ${this.settings.accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch objects');
            }

            const objects = await response.json();
            const content = this.formatObjects(objects);
            
            await this.app.vault.adapter.write(this.settings.objectsFilePath, content);
        } catch (error) {
            console.error('Error syncing objects:', error);
        }
    }

    private formatScheduledItems(items: any[]): string {
        return items.map(item => `- [ ] ${item.title} (${item.due_date})`).join('\n');
    }

    private formatInboxItems(items: any[]): string {
        return items.map(item => `- ${item.title}`).join('\n');
    }

    private formatObjects(objects: any[]): string {
        return objects.map(obj => {
            if (obj.type === 'task') {
                return `- [ ] ${obj.title}`;
            } else if (obj.type === 'bookmark') {
                return `- [${obj.title}](${obj.url})`;
            }
            return `- ${obj.title}`;
        }).join('\n');
    }
}

class EmptyArraySettingTab extends PluginSettingTab {
    plugin: EmptyArraySync;

    constructor(app: App, plugin: EmptyArraySync) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Access Token')
            .setDesc('EmptyArray API access token')
            .addText(text => text
                .setPlaceholder('Enter your access token')
                .setValue(this.plugin.settings.accessToken)
                .onChange(async (value) => {
                    this.plugin.settings.accessToken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Inbox File Path')
            .setDesc('Path to the inbox file')
            .addText(text => text
                .setPlaceholder('inbox.md')
                .setValue(this.plugin.settings.inboxFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.inboxFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Objects File Path')
            .setDesc('Path to the objects file')
            .addText(text => text
                .setPlaceholder('objects.md')
                .setValue(this.plugin.settings.objectsFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.objectsFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Daily Note Format')
            .setDesc('Format for daily note filenames (moment.js format)')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dailyNoteFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dailyNoteFormat = value;
                    await this.plugin.saveSettings();
                }));
    }
}
