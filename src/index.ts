import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import {EventEmitter} from 'events';

export interface IOptions {
    all?: boolean;
    lines?: number;
    since?: Date | 'now' | 'yesterday' | 'today' | 'tomorrow';
    utc?: boolean;
    identifier?: string;
    units?: string | string[];

}

export interface IJournalEvent {
    priority: string;
    syslogFacility: string;
    syslogIdentifier: string;
    codeFile: string;
    codeFunc: string;
    jobType: string;
    jobResult: string;
    messageId: string;
    codeLine: string;
    unit: string;
    message: string;
    invocationId: string;
}

const defaults: IOptions = {
    utc: true,
};

class Decoder {
    private str = false;
    private esc = false;
    private obj = 0;
    private data = '';

    constructor(public cb: (data: IJournalEvent) => void) {
    }

    private decodeChar(c) {
        if (!this.str && c === '{' && this.obj++ === 0) {
            this.data = '';
        }

        this.data += c;

        if (c === '"' && !this.esc) {
            this.str = !this.str;
        }

        if (!this.esc && c === '\\') {
            this.esc = true;
        } else if (this.esc) {
            this.esc = false;
        }

        if (!this.str && c === '}' && --this.obj === 0) {
            const parsed = JSON.parse(this.data);
            let message: number[] | string = parsed.MESSAGE;
            if (message instanceof Array) {
                // Convert char codes to string
                message = String.fromCharCode.apply(null, message) as string;

                // Replace ANSI escape code with regex
                const r = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
                message = message.replace(r, '');
            }
            this.cb({
                priority: parsed.PRIORITY,
                syslogFacility: parsed.SYSLOG_FACILITY,
                syslogIdentifier: parsed.SYSLOG_IDENTIFIER,
                codeFile: parsed.CODE_FILE,
                codeFunc: parsed.CODE_FUNC,
                jobType: parsed.JOB_TYPE,
                jobResult: parsed.JOB_RESULT,
                messageId: parsed.MESSAGE_ID,
                codeLine: parsed.CODE_LINE,
                unit: parsed.UNIT,
                message: message,
                invocationId: parsed.INVOCATION_ID,
            });
        }
    };

    decode(str: string): void {
        for (let i = 0; i < str.length; i++) {
            this.decodeChar(str[i]);
        }
    }
}

export default class Journalctl extends EventEmitter {
    private sp: ChildProcessWithoutNullStreams;

    constructor(options?: IOptions) {
        super();
        options = {
            ...defaults,
            ...options,
        };
        const args = [
            '-f',
            '-o',
            'json',
        ];

        if (options.all) {
            args.push('-a');
        }
        if (options.lines) {
            args.push('-n', options.lines.toString());
        }

        if (options.since) {
            const formatDate = (date: Date): string => {
                const addZero = (num: number): string => {
                    if (num < 10) {
                        return `0${num.toString()}`;
                    }
                    return num.toString();
                };

                let [year, month, day, hours, minutes, seconds] = [
                    date.getUTCFullYear(),
                    addZero(date.getUTCMonth()),
                    addZero(date.getUTCDay()),
                    addZero(date.getUTCHours()),
                    addZero(date.getUTCMinutes()),
                    addZero(date.getUTCSeconds()),
                ];


                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            };
            args.push('-S', (options.since instanceof Date ? formatDate(options.since) : options.since));
        }

        if (options.identifier) {
            args.push('-t', options.identifier);
        }
        if (options.units && options.units.length > 0) {
            if (!(options.units instanceof Array)) {
                options.units = [options.units];
            }
            for (const unit of options.units) {
                args.push('-u', unit);
            }
        }

        this.sp = spawn('journalctl', args);

        const decoder = new Decoder(data => this.emit('event', data));

        this.sp.stdout.on('data', chunk => {
            decoder.decode(chunk.toString());
        });
    }

    stop(signal?: NodeJS.Signals | number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const timeout = setTimeout(() => resolve(), 5000);
            this.sp.on('exit', code => {
                clearTimeout(timeout);
                resolve(code);
            });

            try {
                this.sp.kill(signal);
            } catch (e) {
                reject(e);
            }

        });
    }

    // noinspection InfiniteRecursionJS
    addListener(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.addListener(event, listener);
    }

    // noinspection InfiniteRecursionJS
    on(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.on(event, listener);
    }

    // noinspection InfiniteRecursionJS
    once(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.once(event, listener);
    }

    // noinspection InfiniteRecursionJS
    removeListener(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.removeListener(event, listener);
    }

    // noinspection InfiniteRecursionJS
    off(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.off(event, listener);
    }

    // noinspection InfiniteRecursionJS
    removeAllListeners(event?: 'event'): this {
        return super.removeAllListeners(event);
    }

    // noinspection InfiniteRecursionJS
    listeners(event: 'event'): Function[] {
        return super.listeners(event);
    }

    // noinspection InfiniteRecursionJS
    rawListeners(event: 'event'): Function[] {
        return super.rawListeners(event);
    }

    // noinspection InfiniteRecursionJS
    emit(event: 'event', ...args: any[]): boolean {
        return super.emit(event, ...args);
    }

    // noinspection InfiniteRecursionJS
    prependListener(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.prependListener(event, listener);
    }

    // noinspection InfiniteRecursionJS
    prependOnceListener(event: 'event', listener: (data: IJournalEvent) => void): this {
        return super.prependOnceListener(event, listener);
    }
}