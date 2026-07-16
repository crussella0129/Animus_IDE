import * as vscode from 'vscode';
import * as http from 'http';

export interface SseEvent {
    event: string;
    data: any;
}

export class FerricClient {
    private get apiBase(): string {
        return vscode.workspace.getConfiguration('ferric').get('apiBase', 'http://127.0.0.1:3581');
    }

    public async streamQuery(
        prompt: string,
        workspace: string,
        onEvent: (event: SseEvent) => void,
        token: vscode.CancellationToken
    ): Promise<void> {
        return this.stream('/v1/query/stream', { prompt, workspace }, onEvent, token);
    }

    private stream(
        path: string,
        body: any,
        onEvent: (event: SseEvent) => void,
        token: vscode.CancellationToken
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.apiBase);
            const reqData = JSON.stringify(body);
            const req = http.request(
                {
                    hostname: url.hostname,
                    port: url.port,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(reqData),
                        'Accept': 'text/event-stream',
                    }
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`API Error: ${res.statusCode}`));
                        return;
                    }

                    let buffer = '';
                    res.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                        let lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep the last incomplete line

                        let currentEvent = 'message';
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.startsWith('event: ')) {
                                currentEvent = line.substring(7).trim();
                            } else if (line.startsWith('data: ')) {
                                const dataStr = line.substring(6).trim();
                                if (dataStr) {
                                    try {
                                        const data = JSON.parse(dataStr);
                                        onEvent({ event: currentEvent, data });
                                        if (currentEvent === 'done' || currentEvent === 'error') {
                                            resolve();
                                        }
                                    } catch (e) {
                                        console.error('Failed to parse SSE data', dataStr);
                                    }
                                }
                            }
                        }
                    });

                    res.on('end', () => {
                        resolve();
                    });
                }
            );

            req.on('error', (e) => reject(e));
            
            token.onCancellationRequested(() => {
                req.destroy();
                resolve();
            });

            req.write(reqData);
            req.end();
        });
    }
}
