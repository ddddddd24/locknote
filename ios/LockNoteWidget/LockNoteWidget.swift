/**
 * LockNoteWidget.swift — iOS WidgetKit lock-screen / home-screen widget
 *
 * This file lives in a SEPARATE Xcode target called "LockNoteWidget"
 * (File → New → Target → Widget Extension in Xcode).
 *
 * Data flow:
 *  1. The main React Native app writes the latest message into a shared
 *     App Group UserDefaults container via react-native-widget-extension.
 *  2. This widget extension reads from the same container.
 *  3. The widget refreshes via getTimeline() or when the main app calls
 *     WidgetCenter.shared.reloadAllTimelines() after receiving a new message.
 *
 * App Group identifier used throughout: group.com.locknote.widget
 * (Create this in Xcode → Signing & Capabilities → App Groups for BOTH targets.)
 */

import WidgetKit
import SwiftUI

// MARK: - Shared Data Model

struct LockNoteEntry: TimelineEntry {
    let date:      Date
    let message:   String
    let fromName:  String
    let type:      String      // "text" | "drawing"
    let timestamp: Double      // Unix ms

    static let placeholder = LockNoteEntry(
        date:      Date(),
        message:   "Write a note to your partner 💌",
        fromName:  "",
        type:      "text",
        timestamp: 0
    )
}

// MARK: - Timeline Provider

struct LockNoteProvider: TimelineProvider {

    private let appGroupId = "group.com.locknote.widget"
    private let dataKey    = "locknote_latest_message"

    /// Called while the widget is in the placeholder state (greyed out preview).
    func placeholder(in context: Context) -> LockNoteEntry {
        LockNoteEntry.placeholder
    }

    /// Called for the widget gallery preview (Xcode canvas / widget picker).
    func getSnapshot(in context: Context, completion: @escaping (LockNoteEntry) -> Void) {
        completion(loadEntry() ?? LockNoteEntry.placeholder)
    }

    /// Called to build the real timeline. We return a single entry refreshed every 15 min
    /// as a safety net; real-time updates are pushed by the main app via
    /// WidgetCenter.shared.reloadAllTimelines() after writing new data.
    func getTimeline(in context: Context, completion: @escaping (Timeline<LockNoteEntry>) -> Void) {
        let entry    = loadEntry() ?? LockNoteEntry.placeholder
        let nextDate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextDate))
        completion(timeline)
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private func loadEntry() -> LockNoteEntry? {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let raw      = defaults.string(forKey: dataKey),
            let data     = raw.data(using: .utf8),
            let json     = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }

        return LockNoteEntry(
            date:      Date(),
            message:   json["message"]  as? String ?? "",
            fromName:  json["fromName"] as? String ?? "",
            type:      json["type"]     as? String ?? "text",
            timestamp: json["timestamp"] as? Double ?? 0
        )
    }
}

// MARK: - Widget Views

struct LockNoteWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: LockNoteEntry

    var body: some View {
        switch family {
        case .systemSmall:  SmallView(entry: entry)
        case .systemMedium: MediumView(entry: entry)
        case .accessoryRectangular: LockScreenView(entry: entry)   // lock screen
        default:            MediumView(entry: entry)
        }
    }
}

// ── Small (2×2) ───────────────────────────────────────────────────────────────

struct SmallView: View {
    let entry: LockNoteEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("💌 LockNote")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "#e94560"))

            Spacer()

            Text(displayText)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(4)
                .multilineTextAlignment(.leading)

            if !entry.fromName.isEmpty {
                Text("— \(entry.fromName)")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "#aaaacc"))
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(hex: "#0d0d1a"))
    }

    var displayText: String {
        entry.type == "drawing" ? "🎨 Drew you something →" : entry.message
    }
}

// ── Medium (4×2) ──────────────────────────────────────────────────────────────

struct MediumView: View {
    let entry: LockNoteEntry
    var body: some View {
        HStack(spacing: 0) {
            // Accent bar
            Rectangle()
                .fill(Color(hex: "#e94560"))
                .frame(width: 3)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("💌 LockNote")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: "#e94560"))
                    Spacer()
                    if entry.timestamp > 0 {
                        Text(timeString)
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "#666688"))
                    }
                }

                Text(displayText)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)

                if !entry.fromName.isEmpty {
                    Text("— \(entry.fromName)")
                        .font(.system(size: 11, weight: .light))
                        .foregroundColor(Color(hex: "#aaaacc"))
                        .italic()
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(hex: "#0d0d1a"))
    }

    var displayText: String {
        entry.type == "drawing" ? "🎨 Drew you something — tap to see it →" : entry.message
    }

    var timeString: String {
        guard entry.timestamp > 0 else { return "" }
        let date = Date(timeIntervalSince1970: entry.timestamp / 1000)
        let fmt  = DateFormatter()
        fmt.timeStyle = .short
        return fmt.string(from: date)
    }
}

// ── Lock screen (accessoryRectangular) ────────────────────────────────────────

struct LockScreenView: View {
    let entry: LockNoteEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("💌 \(entry.fromName.isEmpty ? "LockNote" : entry.fromName)")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white)
            Text(entry.type == "drawing" ? "🎨 Drawing — tap to view" : entry.message)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.85))
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Widget Bundle Entry Point

struct LockNoteWidgetBundle: Widget {
    let kind = "LockNoteWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockNoteProvider()) { entry in
            LockNoteWidgetView(entry: entry)
        }
        .configurationDisplayName("LockNote")
        .description("See the latest note from your partner.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryRectangular,   // iOS 16+ lock screen
        ])
    }
}

// MARK: - Helpers

extension Color {
    init(hex: String) {
        let hex    = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int    = UInt64()
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >>  8) & 0xFF) / 255
        let b = Double( int        & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Preview

#Preview(as: .systemMedium) {
    LockNoteWidgetBundle()
} timeline: {
    LockNoteEntry(
        date:      Date(),
        message:   "Missing you already 💕",
        fromName:  "Alex",
        type:      "text",
        timestamp: Date().timeIntervalSince1970 * 1000
    )
}
