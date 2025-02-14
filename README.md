# ride-sharing

An app simulating a real-life ride-sharing system.

Key Features:

- Users can only be created through a UserFactory (enforced through a key)
- Users can become Premium only after crossing a spending threshold
- Some drivers are marked as VIP after fetching
- Users request a ride, optionally preferring a VIP driver
- Rides are assigned to the first available VIP or non-VIP driver
- Users and drivers are notified when a ride is 'accepted' and when it's completed
- VIP drivers cost more and Premium users receive a discount (regardless of ride type)

Design Patterns:

- Singleton
- Factory
- Observer
- Encapsulation
- Dependency injection
- Lazy initialization
- Generator function
- Inheritance

Run the project in the models directory with node index.js
