import SwiftUI

struct GoogleLogo: View {
    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let cx = w / 2
            let cy = h / 2
            let r = min(w, h) / 2
            let innerR = r * 0.55
            let barH = r * 0.38

            // Blue (right arc: -45° to 45°)
            var blue = Path()
            blue.move(to: CGPoint(x: cx, y: cy))
            blue.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                        startAngle: .degrees(-45), endAngle: .degrees(45), clockwise: false)
            blue.closeSubpath()
            context.fill(blue, with: .color(Color(red: 0.26, green: 0.52, blue: 0.96)))

            // Green (bottom-right arc: 45° to 135°)
            var green = Path()
            green.move(to: CGPoint(x: cx, y: cy))
            green.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                         startAngle: .degrees(45), endAngle: .degrees(135), clockwise: false)
            green.closeSubpath()
            context.fill(green, with: .color(Color(red: 0.20, green: 0.66, blue: 0.33)))

            // Yellow (bottom-left arc: 135° to 225°)
            var yellow = Path()
            yellow.move(to: CGPoint(x: cx, y: cy))
            yellow.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                          startAngle: .degrees(135), endAngle: .degrees(225), clockwise: false)
            yellow.closeSubpath()
            context.fill(yellow, with: .color(Color(red: 0.98, green: 0.74, blue: 0.02)))

            // Red (top-left arc: 225° to 315°)
            var red = Path()
            red.move(to: CGPoint(x: cx, y: cy))
            red.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                       startAngle: .degrees(225), endAngle: .degrees(315), clockwise: false)
            red.closeSubpath()
            context.fill(red, with: .color(Color(red: 0.92, green: 0.26, blue: 0.21)))

            // White center circle
            var inner = Path()
            inner.addAllipse(in: CGRect(x: cx - innerR, y: cy - innerR, width: innerR * 2, height: innerR * 2))
            context.fill(inner, with: .color(.white))

            // Horizontal bar (the Google "G" crossbar) - blue color
            let barRect = CGRect(x: cx, y: cy - barH / 2, width: r * 0.95, height: barH)
            context.fill(Path(barRect), with: .color(Color(red: 0.26, green: 0.52, blue: 0.96)))
        }
    }
}

// Path extension since Canvas doesn't have addEllipse directly on Path via addAllipse typo guard
private extension Path {
    mutating func addAllipse(in rect: CGRect) {
        addEllipse(in: rect)
    }
}

#Preview {
    GoogleLogo()
        .frame(width: 40, height: 40)
}
