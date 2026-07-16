import * as vscode from 'vscode';
import { FerricClient } from './ferricClient';

export function registerChatProvider(context: vscode.ExtensionContext, client: FerricClient) {
    const provider: vscode.LanguageModelChatProvider = {
        provideLanguageModelChatResponse: async (model, messages, options, progress, token) => {
            let prompt = '';
            for (const msg of messages) {
                if (msg.role === vscode.LanguageModelChatMessageRole.User) {
                    prompt += msg.content.map(c => {
                        if (typeof c === 'string') return c;
                        return '';
                    }).join('') + '\n';
                }
            }

            const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

            return new Promise<void>((resolve, reject) => {
                client.streamQuery(prompt, workspace, (e) => {
                    if (e.event === 'summary') {
                        progress.report(new vscode.LanguageModelTextPart(e.data.text));
                    }
                }, token).then(() => {
                    resolve();
                }).catch(reject);
            });
        },
        provideLanguageModelChatInformation: (options, token) => {
            return [{
                id: 'animus:ferric',
                name: 'Ferric',
                vendor: 'animus',
                family: 'ferric',
                version: '1.0',
                maxInputTokens: 8192,
            } as any];
        },
        provideTokenCount: async (model, text, token) => {
            return 0; // Not strictly needed
        }
    };

    const disposable = vscode.lm.registerLanguageModelChatProvider('animus', provider);
    context.subscriptions.push(disposable);
}
