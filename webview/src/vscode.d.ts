declare interface InMessageMap {
    Update: string;
}
declare interface OutMessageMap {
    Save: string;
}
declare interface State {
    text: string;
}
declare type InMessageCB<T extends keyof InMessageMap> = (data: InMessageMap[T]) => void
declare interface OutMessage<T extends keyof OutMessageMap> {
    type: T;
    data: OutMessageMap[T];
}
declare interface VSCode<T> {
    getState(): T | undefined;
    setState(state: T): void;
    postMessage<K extends keyof OutMessageMap>(message: OutMessage<K>): void;
}
declare function acquireVsCodeApi(): VSCode<State>;