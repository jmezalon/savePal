import SwiftUI

extension Color {
    // Primary brand - blue-600 (#2563EB)
    static let savePalBlue = Color(red: 0.145, green: 0.388, blue: 0.922)
    // Darker hover - blue-700 (#1D4ED8)
    static let savePalBlueDark = Color(red: 0.114, green: 0.306, blue: 0.847)
    // Light blue bg - blue-50 (#EFF6FF)
    static let savePalBlueLight = Color(red: 0.937, green: 0.965, blue: 1.0)

    // Success green - green-600 (#16A34A)
    static let savePalGreen = Color(red: 0.086, green: 0.639, blue: 0.290)

    // Error red - red-600 (#DC2626)
    static let savePalRed = Color(red: 0.863, green: 0.149, blue: 0.149)

    // Warning amber - amber-600 (#D97706)
    static let savePalAmber = Color(red: 0.851, green: 0.467, blue: 0.024)

    // Text colors
    static let savePalText = Color(red: 0.067, green: 0.094, blue: 0.153)         // gray-900
    static let savePalTextSecondary = Color(red: 0.294, green: 0.333, blue: 0.388) // gray-700
    static let savePalTextTertiary = Color(red: 0.420, green: 0.451, blue: 0.498)  // gray-500

    // Background
    static let savePalBg = Color(red: 0.976, green: 0.980, blue: 0.984)           // gray-50

    // Borders
    static let savePalBorder = Color(red: 0.898, green: 0.906, blue: 0.922)       // gray-200

    // Legacy alias - maps to primary blue now
    static let savePalPrimary = savePalBlue
}
