package com.sra.model;

import com.google.cloud.firestore.GeoPoint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * UserProfile — represents a user (volunteer, NGO admin, or platform admin).
 * Maps to the Firestore users/{uid} document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {
    private String uid;
    private String role;                    // volunteer | ngo | admin
    private String name;
    private String email;
    private String phone;
    private String photoURL;
    private boolean verified;
    private com.google.cloud.Timestamp createdAt;

    // ── Volunteer-only fields ──
    private List<String> skills;
    private List<Double> skillEmbedding;    // 768-dim Vertex AI vector
    private String experience;
    private List<String> languages;
    private GeoPoint location;
    private String locationName;
    private Map<String, Object> availability;  // { dates: [], timeSlots: [] }
    private int totalPoints;
    private List<String> badges;
    private String fcmToken;

    // ── NGO-only fields ──
    private String ngoId;
    private String registrationNo;
}
