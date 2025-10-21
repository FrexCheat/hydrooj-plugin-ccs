export class TimeUtils {
    static getContestTime(tdoc: any, now: Date): string {
        return TimeUtils.formatDuration(Math.max(0, now.getTime() - tdoc.beginAt.getTime()));
    }

    static formatDuration(ms: number): string {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milli = ms % 1000;
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milli).padStart(3, '0')}`;
    }

    static formatTime(date: Date): string {
        const offset = -date.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const pad = (num: number) => String(Math.abs(num)).padStart(2, '0');
        const hours = Math.floor(offset / 60);
        const minutes = offset % 60;

        return `${date.getFullYear()
        }-${pad(date.getMonth() + 1)
        }-${pad(date.getDate())
        }T${pad(date.getHours())
        }:${pad(date.getMinutes())
        }:${pad(date.getSeconds())
        }.${String(date.getMilliseconds()).padStart(3, '0')
        }${sign}${pad(hours)}:${pad(minutes)}`;
    }
}
