import { commands, window, ViewColumn, Uri, workspace } from 'vscode'
import { resolve } from 'path'
import { readFile } from 'fs'
import type { ExtensionContext, WebviewPanel, Disposable } from 'vscode'
import { toFile } from 'qrcode'

async function GetWebviewContent(context: ExtensionContext): Promise<string> {
    const publicPath = resolve(context.extensionPath, 'public')
    const htmlPath = resolve(publicPath, 'index.html')
    const htmlContent = await new Promise<string>((resolve, reject) => readFile(htmlPath, 'utf-8', (err, data) => {
        if (err) {
            reject(err)
        } else {
            resolve(data)
        }
    }))
    return htmlContent.replace(/(<script.+?src=")(.+?)"/, (match, $1, $2) => {
        return `${$1}${Uri.file(resolve(publicPath, $2)).with({ scheme: 'vscode-resource' })}"`
    })
}

export function activate(context: ExtensionContext): void {
    let panel: WebviewPanel | null = null
    const onSave = async (text: string): Promise<void> => {
        const defaultUri = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : undefined
        const uri = await window.showSaveDialog({ defaultUri, filters: { png: ['png',], svg: ['svg'] } })
        if (uri) {
            toFile(uri.fsPath, text, (err) => {
                if (err) {
                    window.showErrorMessage(err.message)
                }
            })

        }
    }
    const inMessageCBMap: { [T in keyof InMessageMap]: InMessageCB<T> } = {
        Save: onSave
    }
    context.subscriptions.push(commands.registerCommand('vscodeQRCode.preview', async () => {
        if (panel) {
            panel.reveal(ViewColumn.Beside)
        } else {
            panel = window.createWebviewPanel(
                'QRCodePreview',
                '预览二维码',
                ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [Uri.file(resolve(context.extensionPath, 'public'))]
                }
            )
            const html = await GetWebviewContent(context)
            panel.webview.html = html
            const dispose: Disposable[] = []
            dispose.push(panel.onDidDispose(() => {
                panel = null
                dispose.forEach(d => d.dispose())
            }))
            dispose.push(panel.webview.onDidReceiveMessage(async (message) => {
                if (message.type in inMessageCBMap) {
                    inMessageCBMap[message.type as keyof InMessageMap](message.data)
                }
            })
            )
        }
        if (window.activeTextEditor) {
            const selection = window.activeTextEditor.selection
            if (!selection.isEmpty) {
                const document = window.activeTextEditor.document
                const text = document.getText(selection)
                const message: OutMessage<'Update'> = {
                    type: 'Update',
                    data: text
                }
                panel.webview.postMessage(message)
            }
        }
    }))
}