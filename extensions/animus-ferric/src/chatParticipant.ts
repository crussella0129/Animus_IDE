import * as vscode from 'vscode';
import { FerricClient } from './ferricClient';

export function registerChatParticipant(context: vscode.ExtensionContext, client: FerricClient) {
    const participant = vscode.chat.createChatParticipant('animus.ferric', async (request, context, response, token) => {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const prompt = request.prompt;

        return new Promise<void>((resolve, reject) => {
            client.streamQuery(prompt, workspace, (e) => {
                if (e.event === 'thought') {
                    // Render thought stream as markdown code block or plain text
                    // response.markdown(e.data.text); 
                } else if (e.event === 'tool') {
                    response.progress(`Calling tool: ${e.data.name}`);
                } else if (e.event === 'summary') {
                    response.markdown(e.data.text);
                } else if (e.event === 'done') {
                    // done
                }
            }, token).then(() => {
                resolve();
            }).catch((err) => {
                response.markdown(`\n\n**Error**: ${err.message}`);
                reject(err);
            });
        });
    });

    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
    context.subscriptions.push(participant);
}
