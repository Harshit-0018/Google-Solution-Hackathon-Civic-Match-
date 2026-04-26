package com.sra.model;

import com.google.cloud.firestore.GeoPoint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Task — represents a community need posted by an NGO.
 * Maps to the Firestore tasks/{taskId} document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {
    private String taskId;
    private String ngoId;
    private String ngoName;
    private String title;
    private String description;
    private Map<String, String> descriptionTranslated;
    private int urgency;                    // 1–5
    private double urgencyScore;            // computed: urgency × recency factor
    private String category;                // education | healthcare | disaster | environment | other
    private List<String> requiredSkills;
    private List<Double> requiredSkillsEmbedding;  // 768-dim Vertex AI vector
    private GeoPoint location;
    private String locationName;
    private String address;
    private int volunteersRequired;
    private int volunteersMatched;
    private String startDate;               // ISO date
    private String endDate;
    private String status;                  // open | matching | active | completed | cancelled
    private List<String> applicants;        // volunteer UIDs who self-applied
    private com.google.cloud.Timestamp createdAt;
    private com.google.cloud.Timestamp updatedAt;
}
