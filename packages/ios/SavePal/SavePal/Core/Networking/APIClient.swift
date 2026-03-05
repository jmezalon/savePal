import Foundation

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 120
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
    }

    // MARK: - Core Request

    func request<T: Codable>(
        url urlString: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = KeychainHelper.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        if httpResponse.statusCode == 401 {
            await MainActor.run {
                AuthManager.shared.handleUnauthorized()
            }
            throw APIError.unauthorized
        }

        // Try to decode as API response envelope
        if let apiResponse = try? decoder.decode(APIResponse<T>.self, from: data) {
            if apiResponse.success, let responseData = apiResponse.data {
                return responseData
            } else if let error = apiResponse.error {
                throw APIError.serverError(error)
            } else if !apiResponse.success {
                throw APIError.serverError(apiResponse.message ?? "Request failed")
            }
        }

        // Fallback: try to decode as raw T
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            // If T is EmptyData and the response was successful, return empty
            if httpResponse.statusCode >= 200 && httpResponse.statusCode < 300,
               let empty = EmptyData() as? T {
                return empty
            }
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Convenience: request that returns message only

    func requestMessage(
        url urlString: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        authenticated: Bool = true
    ) async throws -> String {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = KeychainHelper.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        if httpResponse.statusCode == 401 {
            await MainActor.run {
                AuthManager.shared.handleUnauthorized()
            }
            throw APIError.unauthorized
        }

        if let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data) {
            if apiResponse.success {
                return apiResponse.message ?? "Success"
            } else {
                throw APIError.serverError(apiResponse.error ?? apiResponse.message ?? "Request failed")
            }
        }

        if httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 {
            return "Success"
        }

        throw APIError.unknown
    }
}
