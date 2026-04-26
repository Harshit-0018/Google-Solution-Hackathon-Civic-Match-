package com.sra.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * MatchScore — holds the computed score breakdown for a single volunteer–task pair.
 * Used during the matching algorithm run and persisted to Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchScore {
    private String volunteerId;
    private double total;
    private double skill;
    private double proximity;
    private double availability;
    private double impact;
    private double distanceKm;
}
