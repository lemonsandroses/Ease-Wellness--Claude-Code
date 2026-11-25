import Capacitor
import DeviceActivity
import FamilyControls
import SwiftUI
import UIKit

/**
 Screen time for the Patterns tab.

 Apple gives no way to read the Screen Time totals shown in Settings. The
 `DeviceActivityReport` extension can draw them, but its sandbox blocks every
 route back out — network, App Group, all of it — and that is deliberate.

 The one callback that does escape is `DeviceActivityMonitor`, which fires when
 usage crosses a threshold registered ahead of time. So we lay a ladder of
 thresholds and count the rungs: every callback is `RUNG_MINUTES` of use. The
 extension tallies them into the shared App Group; this plugin reads the tally.

 The ladder is split across twelve two-hour schedules because iOS refuses more
 than about twenty simultaneous monitored activities, and a single all-day
 schedule cannot carry enough thresholds to give useful resolution.

 Limits are inherent, not incidental:
   • Resolution is one rung.
   • No history — counting starts when monitoring does.
   • Only the apps chosen in the picker. Apple publishes no "all apps" token,
     so a whole-device total is not available to third parties.
 */
@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenTimePlugin"
    public let jsName = "ScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "chooseApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise)
    ]

    // Must match the App Group on both this target and the monitor extension,
    // and the suite name the extension writes to.
    static let appGroup = "group.com.easewellness.app.screentime"
    static let selectionKey = "screentime.selection"
    static let rungMinutes = 5

    private var defaults: UserDefaults? { UserDefaults(suiteName: Self.appGroup) }

    // MARK: - Status

    @objc func status(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            return call.resolve(["status": "unsupported", "appCount": 0])
        }
        let selection = loadSelection()
        let count = (selection?.applicationTokens.count ?? 0) + (selection?.categoryTokens.count ?? 0)

        switch AuthorizationCenter.shared.authorizationStatus {
        case .notDetermined:
            call.resolve(["status": "unauthorized", "appCount": count])
        case .denied:
            call.resolve(["status": "denied", "appCount": count])
        case .approved:
            call.resolve(["status": count > 0 ? "ready" : "needs-apps", "appCount": count])
        @unknown default:
            call.resolve(["status": "unsupported", "appCount": count])
        }
    }

    // MARK: - Permission

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            return call.resolve(["status": "unsupported"])
        }
        Task {
            do {
                // `.individual` — this person's own device. `.child` is for a
                // parent authorising a different device and would be wrong here.
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                let count = (self.loadSelection()?.applicationTokens.count ?? 0)
                call.resolve(["status": count > 0 ? "ready" : "needs-apps"])
            } catch {
                // Refusal and failure arrive the same way. Reading the centre
                // back tells them apart, so the UI can distinguish "no" from
                // "something broke".
                let denied = AuthorizationCenter.shared.authorizationStatus == .denied
                call.resolve(["status": denied ? "denied" : "unauthorized"])
            }
        }
    }

    // MARK: - App selection

    @objc func chooseApps(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            return call.resolve(["status": "unsupported", "appCount": 0])
        }
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController else {
                return call.resolve(["status": "unsupported", "appCount": 0])
            }
            let picker = FamilyActivityPickerHost(initial: self.loadSelection() ?? .init()) { selection in
                host.dismiss(animated: true)
                self.saveSelection(selection)
                let count = selection.applicationTokens.count + selection.categoryTokens.count
                if count > 0 {
                    self.startMonitoring(selection)
                    call.resolve(["status": "ready", "appCount": count])
                } else {
                    self.stopMonitoring()
                    call.resolve(["status": "needs-apps", "appCount": 0])
                }
            }
            let controller = UIHostingController(rootView: picker)
            host.present(controller, animated: true)
        }
    }

    // MARK: - Reading the tally

    @objc func read(_ call: CAPPluginCall) {
        guard let defaults = defaults else {
            return call.resolve(["days": []])
        }
        // The extension writes one Int per day: how many rungs were reached.
        var days: [[String: Any]] = []
        for (key, value) in defaults.dictionaryRepresentation() {
            guard key.hasPrefix("rungs."), let rungs = value as? Int else { continue }
            let date = String(key.dropFirst("rungs.".count))
            days.append(["date": date, "minutes": rungs * Self.rungMinutes])
        }
        call.resolve(["days": days])
    }

    // MARK: - Monitoring

    @available(iOS 16.0, *)
    private func startMonitoring(_ selection: FamilyActivitySelection) {
        let center = DeviceActivityCenter()
        center.stopMonitoring()

        // Twelve two-hour windows, each carrying its own ladder. One all-day
        // schedule would hit the per-activity threshold ceiling long before it
        // covered a day at this resolution.
        for block in 0..<12 {
            let startHour = block * 2
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: startHour, minute: 0),
                intervalEnd: DateComponents(hour: startHour + 1, minute: 59),
                repeats: true
            )

            var events: [DeviceActivityName: DeviceActivityEvent] = [:]
            for minute in stride(from: Self.rungMinutes, through: 115, by: Self.rungMinutes) {
                events[DeviceActivityName("rung-\(minute)")] = DeviceActivityEvent(
                    applications: selection.applicationTokens,
                    categories: selection.categoryTokens,
                    webDomains: selection.webDomainTokens,
                    threshold: DateComponents(minute: minute)
                )
            }

            do {
                try center.startMonitoring(DeviceActivityName("ease.block.\(block)"), during: schedule, events: events)
            } catch {
                // One window failing shouldn't cost the other eleven. The
                // estimate degrades rather than disappearing.
                NSLog("[ScreenTime] block \(block) failed: \(error.localizedDescription)")
            }
        }
    }

    @available(iOS 16.0, *)
    private func stopMonitoring() {
        DeviceActivityCenter().stopMonitoring()
    }

    // MARK: - Selection persistence

    @available(iOS 16.0, *)
    private func loadSelection() -> FamilyActivitySelection? {
        guard let data = defaults?.data(forKey: Self.selectionKey) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    @available(iOS 16.0, *)
    private func saveSelection(_ selection: FamilyActivitySelection) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        defaults?.set(data, forKey: Self.selectionKey)
    }
}

/// `FamilyActivityPicker` is SwiftUI-only, so it needs a host view to live in.
@available(iOS 16.0, *)
private struct FamilyActivityPickerHost: View {
    @State var selection: FamilyActivitySelection
    let onDone: (FamilyActivitySelection) -> Void

    init(initial: FamilyActivitySelection, onDone: @escaping (FamilyActivitySelection) -> Void) {
        _selection = State(initialValue: initial)
        self.onDone = onDone
    }

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Choose apps to count")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { onDone(selection) }
                    }
                }
        }
    }
}
