package com.sra.service;

import org.springframework.stereotype.Service;

/**
 * RewardService — volunteer points, badges, and redemption logic.
 *
 * Point allocation (§12):
 *   - Task completion: 50–300 based on urgency
 *   - 5-star rating bonus: +50
 *   - First task milestone: +100
 *   - Referral: +75
 *
 * Badge triggers: first_responder, skill_champion, community_hero,
 *                 speed_volunteer, multilingual
 */
@Service
public class RewardService {
    // TODO: Implement awardPoints(volunteerId, taskId, urgency)
    // TODO: Implement checkBadges(volunteerId)
    // TODO: Implement redeemReward(volunteerId, catalogId)
}
