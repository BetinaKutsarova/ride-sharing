class RideEventManager {
    constructor() {
        this.subscribers = new Map(); // { rideId: [{ observer, role }] }
    }

    subscribe(rideId, observer, role) {
        if (!this.subscribers.has(rideId)) {
            this.subscribers.set(rideId, []);
        }
        this.subscribers.get(rideId).push({ observer, role });
    }

    notify(rideId, userMessage, driverMessage) {
        if (this.subscribers.has(rideId)) {
            this.subscribers.get(rideId).forEach(({ observer, role }) => {
                const message = role === "user" ? userMessage : driverMessage;
                observer.update(message);
            });
        }
    }
}

export default RideEventManager;