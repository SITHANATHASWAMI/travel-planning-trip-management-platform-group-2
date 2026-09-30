package com.tripnest.service;

import com.tripnest.dto.TripRequest;
import com.tripnest.dto.TripResponse;
import com.tripnest.exception.AccessDeniedCustomException;
import com.tripnest.exception.ResourceNotFoundException;
import com.tripnest.model.Trip;
import com.tripnest.model.TripStatus;
import com.tripnest.model.User;
import com.tripnest.repository.TripRepository;
import com.tripnest.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    public TripService(TripRepository tripRepository, UserRepository userRepository) {
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
    }

    public TripResponse createTrip(String ownerEmail, TripRequest request) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        Trip trip = new Trip();
        trip.setTitle(request.getTitle());
        trip.setDestination(request.getDestination());
        trip.setStartDate(request.getStartDate());
        trip.setEndDate(request.getEndDate());
        trip.setBudget(request.getBudget());
        trip.setDescription(request.getDescription());
        trip.setStatus(request.getStatus() != null ? request.getStatus() : TripStatus.PLANNED);
        trip.setOwner(owner);

        tripRepository.save(trip);
        return TripResponse.fromEntity(trip);
    }

    // Trips owned by the user, plus trips they've been added to as a traveler
    public List<TripResponse> getMyTrips(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return tripRepository.findByOwnerIdOrTravelers_IdOrderByStartDateAsc(user.getId(), user.getId())
                .stream()
                .map(TripResponse::fromEntity)
                .toList();
    }

    public Map<String, Object> getTripSummary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Trip> trips = tripRepository.findByOwnerIdOrTravelers_IdOrderByStartDateAsc(user.getId(), user.getId());
        long activePlans = trips.stream()
                .filter(trip -> trip.getStatus() == TripStatus.PLANNED || trip.getStatus() == TripStatus.ONGOING)
                .count();
        long completedTrips = trips.stream()
                .filter(trip -> trip.getStatus() == TripStatus.COMPLETED)
                .count();
        BigDecimal plannedBudget = trips.stream()
                .map(Trip::getBudget)
                .filter(budget -> budget != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalTrips", trips.size());
        summary.put("activePlans", activePlans);
        summary.put("completedTrips", completedTrips);
        summary.put("plannedBudget", plannedBudget);
        return summary;
    }

    public TripResponse getTripById(String email, Long tripId) {
        Trip trip = findTripOrThrow(tripId);
        assertUserCanAccess(email, trip);
        return TripResponse.fromEntity(trip);
    }

    public TripResponse updateTrip(String email, Long tripId, TripRequest request) {
        Trip trip = findTripOrThrow(tripId);
        assertUserIsOwner(email, trip);

        trip.setTitle(request.getTitle());
        trip.setDestination(request.getDestination());
        trip.setStartDate(request.getStartDate());
        trip.setEndDate(request.getEndDate());
        trip.setBudget(request.getBudget());
        trip.setDescription(request.getDescription());
        if (request.getStatus() != null) trip.setStatus(request.getStatus());

        tripRepository.save(trip);
        return TripResponse.fromEntity(trip);
    }

    public void deleteTrip(String email, Long tripId) {
        Trip trip = findTripOrThrow(tripId);
        assertUserIsOwner(email, trip);
        tripRepository.delete(trip);
    }

    // Trip sharing: add a traveler to a trip by email
    public TripResponse addTraveler(String email, Long tripId, String travelerEmail) {
        Trip trip = findTripOrThrow(tripId);
        assertUserIsOwner(email, trip);

        User traveler = userRepository.findByEmail(travelerEmail.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("No user found with that email"));

        trip.getTravelers().add(traveler);
        tripRepository.save(trip);
        return TripResponse.fromEntity(trip);
    }

    private Trip findTripOrThrow(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
    }

    private void assertUserIsOwner(String email, Trip trip) {
        if (!trip.getOwner().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedCustomException("Only the trip owner can perform this action");
        }
    }

    private void assertUserCanAccess(String email, Trip trip) {
        boolean isOwner = trip.getOwner().getEmail().equalsIgnoreCase(email);
        boolean isTraveler = trip.getTravelers().stream()
                .anyMatch(t -> t.getEmail().equalsIgnoreCase(email));
        if (!isOwner && !isTraveler) {
            throw new AccessDeniedCustomException("You do not have access to this trip");
        }
    }
}
