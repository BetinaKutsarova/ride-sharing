const DRIVERS_API_URL = "https://jsonplaceholder.typicode.com/users";
const USERS_API_URL = "https://randomuser.me/api/";

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


class RideSharingApp {
    static #instance = null;
    #activeRides = new Map();
    #availableDrivers = new Map();
    #availableVIPDrivers = new Map();

    constructor() {
        if (RideSharingApp.#instance) {
            return RideSharingApp.#instance;
        }

        RideSharingApp.#instance = this;
    }

    static getInstance() {
        if (!RideSharingApp.#instance) {
            RideSharingApp.#instance = new RideSharingApp();
        }
        return RideSharingApp.#instance;
    }

    async getDrivers() {
        try {
            const response = await fetch(DRIVERS_API_URL);
            const driversData = await response.json();
            driversData.forEach(data => {
                const isVIP = Math.random() > 0.5; // make some VIPDrivers
                const driver = isVIP ? new VIPDriver(data.name, data.id) : new Driver(data.name, data.id);

                if (isVIP) {
                    this.#availableVIPDrivers.set(data.id, driver);
                } else {
                    this.#availableDrivers.set(data.id, driver);
                }
            });
        } catch (error) {
            console.error('Error fetching drivers!', error);
            throw error;
        }
    }

    getAllDrivers() {
        return { regular: this.#availableDrivers, vip: this.#availableVIPDrivers };
    }

    getAvailableDriver(preferVIP = false) { // generator to find a driver match
        function* findAvailable(map) {
            for (const driver of map.values()) {
                if (driver.isAvailable) yield driver;
            }
        }

        // fall back to regular drivers if no VIP available
        return preferVIP ? findAvailable(this.#availableVIPDrivers).next().value || findAvailable(this.#availableDrivers).next().value || null
            : findAvailable(this.#availableDrivers).next().value || null;
    }

    getActiveRides() {
        return this.#activeRides;
    }

    createRide(user, pickupLocation, dropoffLocation, preferVIP = false) {
        const ride = new Ride(user, pickupLocation, dropoffLocation);
        const availableDriver = this.getAvailableDriver(preferVIP);
    
        if (!availableDriver) {
            throw new Error("All drivers are busy, please try again later.");
        }
    
        ride.assignDriver(availableDriver);
        availableDriver.isAvailable = false;
        this.#activeRides.set(ride.id, ride);
    
        // check if assigned driver is vip
        const isVIPDriver = this.#availableVIPDrivers.has(availableDriver.id);

        if (preferVIP && !isVIPDriver) {
            console.log(
                `Unfortunately, no VIP drivers were available. A regular driver has been assigned.`
            );
        }
        
        console.log(
            isVIPDriver
                ? `VIP Ride created for ${user.name} from ${pickupLocation} to ${dropoffLocation}. VIP Driver: ${availableDriver.name}`
                : `Ride created for ${user.name} from ${pickupLocation} to ${dropoffLocation}. Driver: ${availableDriver.name}`
        );
    
        return ride;
    }
    

    completeRide(ride) {
        ride.complete();
        if (ride.driver) {
            ride.driver.isAvailable = true;
        }
        this.#activeRides.delete(ride.id);
    }
}

class User {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    getTotalSpending() {
        return UserFactory.getUserSpending(this.id);
    }

    update(message) {
        console.log(message);
    }
}

class PremiumUser extends User {
    #discountPercentage = 20;

    constructor(id, name) {
        super(id, name);
    }

    getDiscount() {
        return this.#discountPercentage;
    }
}

class UserFactory {
    static #PREMIUM_THRESHOLD = 100;
    static #userSpending = new Map();
    static #activeUsers = new Map();

    static async fetchAndCreateUser() {
        try {
            const response = await fetch(`${USERS_API_URL}`);
            const data = await response.json();
            const userData = data.results[0];

            const userId = userData.login.uuid; // generates an id for the user
            const name = `${userData.name.first} ${userData.name.last}`;

            return this.createUser(userId, name);
        } catch (error) {
            console.error('Error fetching user!', error);
            throw error;
        }
    }

    static createUser(id, name) {
        const user = new User(id, name);
        UserFactory.#activeUsers.set(id, user);
        return user;
    }

    static addUserSpending(user, amount) {
        const currentSpending = UserFactory.#userSpending.get(user.id) || 0;
        const newSpending = currentSpending + amount;
        UserFactory.#userSpending.set(user.id, newSpending);

        if (newSpending >= UserFactory.#PREMIUM_THRESHOLD && !(user instanceof PremiumUser)) {
            return UserFactory.#upgradeUserToPremium(user);
        }
        return user;
    }

    static #upgradeUserToPremium(user) {
        const premiumUser = new PremiumUser(user.id, user.name);
        UserFactory.#activeUsers.set(user.id, premiumUser);
        console.log(`${user.name} has been upgraded to Premium status! They are now eligible for a Premium Client discount of 20%`);
        return premiumUser;
    }

    static getUserSpending(userId) {
        return UserFactory.#userSpending.get(userId) || 0;
    }

    static getUser(id) {
        return UserFactory.#activeUsers.get(id);
    }
}

class Ride {
    static #nextId = 1;
    static eventManager = new RideEventManager();

    constructor(user, pickupLocation, dropoffLocation) {
        this.id = Ride.#nextId++;
        this.userId = user.id;
        this.pickupLocation = pickupLocation;
        this.dropoffLocation = dropoffLocation;
        this.status = "pending";
        this.driver = null;
        this.fare = 0;
    }

    get user() {
        return UserFactory.getUser(this.userId);
    }

    calculateFare(driver) {
        let baseFare = Math.floor(Math.random() * 41) + 10; // $10 - $50

        if (this.user instanceof PremiumUser) {
            baseFare *= 0.8;
        }

        if (driver instanceof VIPDriver) {
            baseFare *= driver.getPremiumRate();
        }

        return baseFare;
    }

    assignDriver(driver) {
        this.driver = driver;
        this.fare = this.calculateFare(driver);
        this.status = "active";
    
        Ride.eventManager.subscribe(this.id, driver, "driver");
        Ride.eventManager.subscribe(this.id, this.user, "user");
    
        Ride.eventManager.notify(
            this.id,
            `Your driver ${driver.name} is on the way to ${this.pickupLocation}`,
            `Driver ${driver.name}, client ${this.user.name} awaits you at ${this.pickupLocation}`
        );
    }
    

    complete() {
        this.status = "completed";
        let user = this.user;
        user = UserFactory.addUserSpending(user, this.fare);
        this.driver.addToBalance(this.fare * 0.8); // driver cut
    
        Ride.eventManager.notify(
            this.id,
            `Your ride has been completed. Fare: $${this.fare}`,   // Message for user
            `Ride with client ${user.name} is completed. Fare: $${this.fare}`  // Message for driver
        );
    
        console.log(`Total spending for ${user.name}: $${user.getTotalSpending()}`);
    }
    
}


class Driver {
    #balance = 0;

    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.isAvailable = true;
    }

    getBalance() {
        return this.#balance;
    }

    addToBalance(amount) {
        this.#balance += amount;
    }

    update(message) {
        console.log(message)
    }
}

class VIPDriver extends Driver {
    #premiumRate = 1.5;

    constructor(name, id, balance) {
        super(name, id, balance);
    }

    getPremiumRate() {
        return this.#premiumRate;
    }
}








// manual checks

(async () => {
    const app = RideSharingApp.getInstance();

    // Fetch drivers from the API
    await app.getDrivers();
    console.log("Drivers fetched and available.");

    // Create users using the UserFactory
    const user1 = await UserFactory.fetchAndCreateUser();

    // Request rides for users
    try {
        app.createRide(user1, "Downtown", "Airport");
        app.createRide(user1, "Suburb", "City Center", true);
        app.createRide(user1, "Suburb", "City Center", true);
        app.createRide(user1, "Suburb", "City Center", true);
        app.createRide(user1, "Suburb", "City Center", true);
    } catch (error) {
        console.error(error.message);
    }

    // Complete all rides
    const activeRides = Array.from(app.getActiveRides().values());
    for (const ride of activeRides) {
        app.completeRide(ride);
    }


})();