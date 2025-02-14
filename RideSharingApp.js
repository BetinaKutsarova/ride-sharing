const DRIVERS_API_URL = "https://jsonplaceholder.typicode.com/users";

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
            console.error('Error fetching drivers!', error.message);
            throw error;
        }
    }

    getAllDrivers() {
        return { regular: this.#availableDrivers, vip: this.#availableVIPDrivers };
    }

    getAvailableDriver(preferVIP = false) { // generator to find a driver match with delay
        function* findAvailable(map) {
            for (const driver of map.values()) {
                if (driver.isAvailable) yield driver;
            }
        }

        // promise resolves after a delay
        function simulateMatching() {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve();
                }, Math.random() * 3000 + 1000);
            });
        }

        return simulateMatching().then(() => {
            // Fall back to regular drivers if no VIP available
            if (preferVIP) {
                const vipDriver = findAvailable(this.#availableVIPDrivers).next().value;
                if (vipDriver) return vipDriver;
                return findAvailable(this.#availableDrivers).next().value || null;
            }

            // Just look for regular drivers
            return findAvailable(this.#availableDrivers).next().value || null;
        });
    }

    getActiveRides() {
        return this.#activeRides;
    }

    async createRide(user, pickupLocation, dropoffLocation, preferVIP = false) {
        const ride = new Ride(user, pickupLocation, dropoffLocation);
        const availableDriver = await this.getAvailableDriver(preferVIP);

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

    #id;
    #name;

    constructor(key, id, name) {
        if (key !== UserFactory.getUserKey()) {  // Prevents direct creation
            throw new Error("User instances must be created through UserFactory!");
        }
        this.#id = id;
        this.#name = name;
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#name;
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

    constructor(key, id, name) {
        if (key !== UserFactory.getUserKey()) {
            throw new Error("Cannot start as a Premium user!");
        }
        super(key, id, name);
    }

    getDiscount() {
        return this.#discountPercentage;
    }
}

class UserFactory {
    // Private static key to enforce the creation of user/premium user only through the factory
    static #USER_KEY = Symbol('UserKey');
    static #PREMIUM_THRESHOLD = 100;
    static #userSpending = new Map();
    static #activeUsers = new Map();

    static createUser(name) {
        const id = crypto.randomUUID();
        const user = new User(UserFactory.#USER_KEY, id, name);
        UserFactory.#activeUsers.set(id, user);
        console.log(`New user created - ${name}`);
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
        const premiumUser = new PremiumUser(UserFactory.#USER_KEY, user.id, user.name);
        UserFactory.#activeUsers.set(user.id, premiumUser);
        console.log(`${user.name} has been upgraded to Premium status! They are now eligible for a Premium Client discount of 20%`);
        return premiumUser;
    }

    static getUserKey() {
        return this.#USER_KEY;
    }

    static getUser(id) {
        return UserFactory.#activeUsers.get(id);
    }

    static getUserSpending(id) {
        return UserFactory.#userSpending.get(id) || 0;
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

        return parseFloat(baseFare.toFixed(2));;
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
    // Ensure Singleton pattern
    const app = RideSharingApp.getInstance();
    const app2 = RideSharingApp.getInstance();
    console.log(app === app2);

    // fetch drivers
    try {
        await app.getDrivers();
        console.log('Drivers fetched and available');
    } catch (error) {
        console.error('Failed to fetch drivers:', error.message);
    }

    // ensure both regular and VIP drivers exist
    await app.getDrivers();
    const { regular, vip } = app.getAllDrivers();
    console.log(regular.size > 0, vip.size > 0);

    // request a driver and ensure it's marked as unavailable after a ride starts (wait for the delay)
    const driverBefore = await app.getAvailableDriver();
    console.log(driverBefore.isAvailable); // Should be true

    const userTest = UserFactory.createUser("TestUser");
    const rideTest = await app.createRide(userTest, "A", "B");

    console.log(driverBefore.isAvailable); // should be false

    // ensure users are properly upgraded after reaching the threshold

    const user = UserFactory.createUser("TestUser2");
    console.log(user instanceof PremiumUser); // Should be false
    UserFactory.addUserSpending(user, 120); // Exceeds premium threshold
    const upgradedUser = UserFactory.getUser(user.id);
    console.log(upgradedUser instanceof PremiumUser); // Should be true


    // Create users using the UserFactory (happy path)
    const user1 = await UserFactory.createUser("Bobi");
    const user2 = await UserFactory.createUser("Ani");
    const user3 = await UserFactory.createUser("Georgi");
    const user4 = await UserFactory.createUser("Ivan");

    // Attempt user creation through the User class (should throw an error)
    try {
        const user2 = new User('InvalidKey', 2, 'Ani');
    } catch (error) {
        console.error(error.message);
    }

    // Attempt Premium user creation through the PremiumUser class (should throw an error)
    try {
        const premiumUser = new PremiumUser('InvalidKey', 3, 'Nikolay');
    } catch (error) {
        console.error(error.message);
    }

    // check fares
    const premiumUser = UserFactory.createUser("RichUser");
    UserFactory.addUserSpending(premiumUser, 200); // Upgrade to Premium

    const driver = new Driver("RegularDriver", "123");
    const vipDriver = new VIPDriver("VIPDriver", "456");

    const ride1 = new Ride(premiumUser, "Point A", "Point B");
    console.log(ride1.calculateFare(driver)); // Should be 20% less than normal

    const ride2 = new Ride(premiumUser, "Point A", "Point B");
    console.log(ride2.calculateFare(vipDriver)); // Should be 20% less + VIP multiplier

    // check notifications
    class TestObserver {
        update(message) {
            console.log("Notification received:", message);
        }
    }

    const testObserverUser = new TestObserver();
    const testObserverDriver = new TestObserver();
    const rideEventManager = new RideEventManager();

    rideEventManager.subscribe(1, testObserverUser, "user");
    rideEventManager.subscribe(1, testObserverDriver, "driver");

    rideEventManager.notify(1, "User Message", "Driver Message");
    // "Notification received: User Message" and "Notification received: Driver Message"


    // ensure VIP driver preference works
    const vipUser = UserFactory.createUser("VIP User");
    const ride = await app.createRide(vipUser, "Downtown", "Airport", true);
    console.log(ride.driver instanceof VIPDriver || ride.driver instanceof Driver);


    // GENERAL HAPPY PATH SIMULATION
    // Create rides for users - each one should notify both the driver and the user + display a general message
    // make user 'Bobi' premium
    try {
        await app.createRide(user1, "Downtown", "Airport");
        await app.createRide(user2, "Home", "Office", true);
        await app.createRide(user3, "School", "Home", true);
        await app.createRide(user4, "Suburb", "City Center", true);
        await app.createRide(user1, "Suburb", "City Center", true);
        await app.createRide(user1, "Airport", "Downtown", true);
        await app.createRide(user1, "Airport", "Downtown", true);
        await app.createRide(user1, "Airport", "Downtown", true);
    } catch (error) {
        console.error(error.message);
    }

    // Complete all rides - each one should notify both the driver and the user
    const activeRides = Array.from(app.getActiveRides().values());
    for (const ride of activeRides) {
        app.completeRide(ride);
    }

})();