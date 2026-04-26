package com.sra.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Match — represents a volunteer-to-task match with scoring breakdown.
 * Maps to the Firestore matches/{matchId} document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Match {
    private String matchId;
    private String taskId;
    private String volunteerId;
    private String ngoId;

    // Scoring breakdown — stored for transparency
    private double scoreTotal;          // 0.0 – 1.0
    private double scoreSkill;
    private double scoreProximity;
    private double scoreAvailability;
    private double scoreImpact;

    private String status;              // pending | accepted | declined | completed | cancelled
    private String matchedBy;           // admin UID who triggered matching
    private String volunteerResponse;   // decline reason, optional
    private com.google.cloud.Timestamp completedAt;
    private double ngoRating;           // NGO rates volunteer after completion, 1–5
    private double volunteerRating;     // volunteer rates NGO after completion, 1–5
    private com.google.cloud.Timestamp createdAt;
}
