import Foundation

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    var message: String?
    var data: T?
    var error: String?
}

struct EmptyData: Codable {}
