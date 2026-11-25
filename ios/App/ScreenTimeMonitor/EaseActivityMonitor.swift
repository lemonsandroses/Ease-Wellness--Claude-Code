import DeviceActivity
import Foundation

/**
 The principal class of the ScreenTimeMonitor app extension.

 This is the only part of the Screen Time API whose output can leave its own
 process. The *report* extension is sealed — no network, no App Group — but the
 *monitor* extension may write to a shared App Group, and that is the whole
 reason this file exists.

 It does one thing: each time usage crosses a registered threshold, add one
 rung to today's tally. The host app multiplies rungs by `rungMinutes`.

 Deliberately dumb. Anything clever here is hard to debug, because an extension
 cannot be attached to and a crash shows up only as silence.
 */
class EaseActivityMonitor: DeviceActivityMonitorExtension {
    private static let appGroup = "group.com.easewellness.app.screentime"

    private var defaults: UserDefaults? { UserDefaults(suiteName: Self.appGroup) }

    private func todayKey() -> String {
        // The local day, to match the dates the app logs against. A UTC day
        // would shift the boundary and misattribute late-evening use.
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        return "rungs.\(fmt.string(from: Date()))"
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        guard let defaults = defaults else { return }

        let key = todayKey()
        let now = Date().timeIntervalSince1970

        // iOS 26 has a known fault where thresholds fire in a burst with no
        // real usage behind them — Apple has acknowledged it on the forums.
        // A rung cannot legitimately arrive less than rungMinutes after the
        // previous one, so anything faster is dropped. Undercounting a genuine
        // burst is much better than inventing screen time that never happened
        // and then charting it against someone's symptoms.
        let lastKey = "lastRung.\(key)"
        let last = defaults.double(forKey: lastKey)
        if last > 0, now - last < Double(5 * 60) - 5 { return }

        defaults.set(defaults.integer(forKey: key) + 1, forKey: key)
        defaults.set(now, forKey: lastKey)
        prune(defaults)
    }

    /// Keep a year. Without this the suite grows a key per day forever.
    private func prune(_ defaults: UserDefaults) {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        let cutoff = fmt.string(from: Date().addingTimeInterval(-365 * 86400))

        for key in defaults.dictionaryRepresentation().keys {
            if key.hasPrefix("rungs."), String(key.dropFirst(6)) < cutoff {
                defaults.removeObject(forKey: key)
            }
            if key.hasPrefix("lastRung.rungs."), String(key.dropFirst(15)) < cutoff {
                defaults.removeObject(forKey: key)
            }
        }
    }
}
