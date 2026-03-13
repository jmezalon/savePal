package com.savepal.app.data.repository

import com.savepal.app.data.model.*
import com.savepal.app.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GroupRepository @Inject constructor(
    private val api: ApiService
) {
    suspend fun getGroups(): Result<List<SavingsGroup>> = apiCall {
        api.getGroups().data ?: emptyList()
    }

    suspend fun getGroup(id: String): Result<SavingsGroup> = apiCall {
        api.getGroup(id).data ?: throw Exception("Group not found")
    }

    suspend fun createGroup(request: CreateGroupRequest): Result<SavingsGroup> = apiCall {
        val response = api.createGroup(request)
        response.data ?: throw Exception(response.error ?: "Failed to create group")
    }

    suspend fun joinGroup(inviteCode: String, autoPayment: Boolean): Result<Membership> = apiCall {
        val response = api.joinGroup(JoinGroupRequest(inviteCode, autoPayment))
        response.data ?: throw Exception(response.error ?: "Failed to join group")
    }

    suspend fun getCreationFeeStatus(): Result<CreationFeeStatus> = apiCall {
        api.getCreationFeeStatus().data ?: CreationFeeStatus(false)
    }

    suspend fun validateWaiverCode(code: String): Result<WaiverCodeValidation> = apiCall {
        api.validateWaiverCode(mapOf("code" to code)).data ?: WaiverCodeValidation(false)
    }

    suspend fun getGroupReadiness(id: String): Result<GroupReadiness> = apiCall {
        api.getGroupReadiness(id).data ?: throw Exception("Failed to check readiness")
    }

    suspend fun startGroup(id: String): Result<SavingsGroup> = apiCall {
        api.startGroup(id).data ?: throw Exception("Failed to start group")
    }

    suspend fun reorderMembers(id: String, positions: List<PositionItem>): Result<String> = apiCall {
        val response = api.reorderMembers(id, ReorderRequest(positions))
        response.message ?: "Reordered"
    }

    suspend fun deleteGroup(id: String): Result<String> = apiCall {
        val response = api.deleteGroup(id)
        response.message ?: "Group deleted"
    }

    suspend fun getGroupCycles(id: String): Result<List<Cycle>> = apiCall {
        api.getGroupCycles(id).data ?: emptyList()
    }

    suspend fun getCycleBids(cycleId: String): Result<List<Bid>> = apiCall {
        api.getCycleBids(cycleId).data ?: emptyList()
    }

    suspend fun placeBid(cycleId: String, amount: Double): Result<Bid> = apiCall {
        val response = api.placeBid(cycleId, PlaceBidRequest(amount))
        response.data ?: throw Exception(response.error ?: "Failed to place bid")
    }

    suspend fun resolveBidding(cycleId: String): Result<BidResolutionResult> = apiCall {
        api.resolveBidding(cycleId).data ?: throw Exception("Failed to resolve bidding")
    }
}
