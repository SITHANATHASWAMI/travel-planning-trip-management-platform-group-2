package com.tripnest.controller;

import com.tripnest.dto.AddTravelerRequest;
import com.tripnest.dto.TripRequest;
import com.tripnest.dto.TripResponse;
import com.tripnest.security.UserPrincipal;
import com.tripnest.service.TripService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@AuthenticationPrincipal UserPrincipal principal,
                                                     @Valid @RequestBody TripRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tripService.createTrip(principal.getUsername(), request));
    }

    @GetMapping
    public List<TripResponse> getMyTrips(@AuthenticationPrincipal UserPrincipal principal) {
        return tripService.getMyTrips(principal.getUsername());
    }

    @GetMapping("/summary")
    public Map<String, Object> getTripSummary(@AuthenticationPrincipal UserPrincipal principal) {
        return tripService.getTripSummary(principal.getUsername());
    }

    @GetMapping("/{id}")
    public TripResponse getTrip(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return tripService.getTripById(principal.getUsername(), id);
    }

    @PutMapping("/{id}")
    public TripResponse updateTrip(@AuthenticationPrincipal UserPrincipal principal,
                                    @PathVariable Long id,
                                    @Valid @RequestBody TripRequest request) {
        return tripService.updateTrip(principal.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrip(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        tripService.deleteTrip(principal.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/travelers")
    public TripResponse addTraveler(@AuthenticationPrincipal UserPrincipal principal,
                                     @PathVariable Long id,
                                     @Valid @RequestBody AddTravelerRequest request) {
        return tripService.addTraveler(principal.getUsername(), id, request.getEmail());
    }
}
