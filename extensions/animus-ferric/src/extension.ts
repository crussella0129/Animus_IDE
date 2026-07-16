import * as vscode from 'vscode';
import { FerricClient } from './ferricClient';
import { registerChatProvider } from './chatProvider';
import { registerChatParticipant } from './chatParticipant';

export function activate(context: vscode.ExtensionContext) {
    console.log('Animus Ferric extension is now active!');

    const client = new FerricClient();

    registerChatProvider(context, client);
    registerChatParticipant(context, client);
}

export function deactivate() {}
