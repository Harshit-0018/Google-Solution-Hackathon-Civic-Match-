package com.sra.service;

import org.springframework.stereotype.Service;

/**
 * MatchingService — core AI matching algorithm.
 *
 * Scoring formula (§11):
 *   finalScore = 0.40×skill + 0.30×proximity + 0.20×availability + 0.10×impact
 *
 * Signals:
 *   - Skill:        cosine similarity of Vertex AI embeddings
 *   - Proximity:    1 / (1 + distKm / 10) via Maps Distance Matrix
 *   - Availability: date overlap × time slot fraction
 *   - Impact:       min(1.0, completedTasks × avgRating / 25)
 */
@Service
public class MatchingService {
    // TODO: Implement runMatching(taskId, adminUid)
    // TODO: Implement computeScore(task, volunteer)
    // TODO: Implement availabilityScore(task, volunteer)
    // TODO: Save top-N matches to Firestore
    // TODO: Trigger FCM notifications for matched volunteers
}
